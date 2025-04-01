import { Readable } from "stream";
import HttpService from "./http-service";
import { useState } from "../utils/state";

import vscode = require("vscode");
import fs = require("fs");
import util = require("util");
import FormData = require("form-data");
import { Resource } from "../models/resource";

const exec = util.promisify(require("child_process").exec);

export class FileService {
  private constructor(
    private readonly bundleUri: vscode.Uri,
    private readonly folderUri: vscode.Uri,
    private readonly resource: Resource
  ) {}

  async sync(resourceId: string): Promise<void> {
    if (await this.hasConflicts()) {
      vscode.window.showErrorMessage(
        vscode.l10n.t("Your local repository contains conflicts, please resolves them before syncing with the server.")
      );
      return;
    }

    await this.commit("commit local changes");
    await this.pull(resourceId);

    if (await this.hasConflicts()) {
      vscode.window.showErrorMessage(
        vscode.l10n.t("Your local repository contains conflicts, please resolves them before syncing with the server.")
      );
      return;
    }

    if (! this.isWorkingTreeClean()) {
      await this.commit("merge remote changes");
    }
    await this.push(resourceId);
  }

  private async push(resourceId: string): Promise<void> {
    const { bundleUri, folderUri } = this;
    try {
      await exec(
        `cd "${folderUri.fsPath}" && git bundle create "${bundleUri.fsPath}" HEAD main`
      );
      const bundleExists = fs.existsSync(bundleUri.fsPath);
      if (!bundleExists) {
        vscode.window.showErrorMessage(
          vscode.l10n.t("Error while bundling the resource")
        );
        return;
      }

      const form = new FormData();
      const bundle = fs.createReadStream(bundleUri.fsPath);
      form.append("bundle", bundle, "bundle.git");

      const httpService = await HttpService.instance();
      await httpService.put(`/files/${resourceId}/`, form, {
        maxBodyLength: Infinity,
        headers: {
          ...form.getHeaders(),
        },
      });

      vscode.window.showInformationMessage(
        vscode.l10n.t("Resource successfully synchronized with PLaTOn")
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        vscode.l10n.t("An error occurred while trying to sync with the server.")
      );
    } finally {
      await vscode.workspace.fs.delete(bundleUri, {
        recursive: true,
        useTrash: false,
      });
    }
  }

  private async pull(resourceId: string): Promise<void> {
    try {
      const { bundleUri, folderUri } = this;
      await FileService.clone(resourceId);
      await exec(`cd "${folderUri.fsPath}" && git pull --no-rebase "${bundleUri.fsPath}"`);
    } catch (error) {
      console.error(error);
    }
  }

  private async commit(message: string): Promise<void> {
    const { folderUri } = this;
    try {
      await exec(
        `cd "${folderUri.fsPath}" && git add . && git commit -m "${message}"`
      );
    } catch (error) {
      console.error(error);
    } // git commit -am will fail if working tree is clean
  }

  private async hasConflicts(): Promise<boolean> {
    try {
      const { folderUri } = this;
      const { stdout, stderr } = await exec(
        `cd "${folderUri.fsPath}" && (git grep -q -e '<<<<<<< ' -e '=======' -e '>>>>>>> ' && exit 1 || exit 0)`
      );
      return !!stdout || !!stderr;
    } catch (error) {
      console.error(error);
      return true;
    }
  }

  private async isWorkingTreeClean(): Promise<boolean> {
    try {
      const { folderUri } = this;
      const { stdout } = await exec(
        `cd "${folderUri.fsPath}" && git status --porcelain`
      );
      return !stdout;
    }
    catch (error) {
      console.error(error);
      return false;
    }
  }

  private static async create(resourceId: string): Promise<FileService> {
    const { globalStorageUri } = useState<vscode.ExtensionContext>("context");
    const bundleUri = vscode.Uri.joinPath(globalStorageUri, "bundle.git");
    const folderUri = vscode.Uri.joinPath(globalStorageUri, resourceId);

    const httpService = await HttpService.instance();
    let resource: Resource;
    try {
      resource = (
        await httpService.get<{resource : Resource}>(`resources/${resourceId}?expands=parent`)
      ).data.resource;
    } catch (error) {
      console.error(error);
      throw new Error("An error occured while fetching resource informations.");
    }
    if (!resource.permissions?.write) {
      throw new Error("You don't have the rights to edit these files.");
    }
    if (fs.existsSync(folderUri.fsPath)) {
      return new FileService(bundleUri, folderUri, resource);
    }

    await FileService.clone(resourceId);



    await exec(`git clone "${bundleUri.fsPath}" "${folderUri.fsPath}"`);
    await vscode.workspace.fs.delete(bundleUri, {
      recursive: true,
      useTrash: false,
    });

    vscode.workspace.updateWorkspaceFolders(
      vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders.length : 0, 
      null,
      { uri: folderUri, name: resource.name }
    );

    return new FileService(bundleUri, folderUri, resource);
  }

  static async instance(resourceId: string): Promise<FileService> {
    const instance = await FileService.create(resourceId);
    return instance;
  }

  private static clone(resourceId: string): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      const httpService = await HttpService.instance();

      const globalStorageUri = useState<vscode.ExtensionContext>("context").globalStorageUri;
      const output = vscode.Uri.joinPath(globalStorageUri, "bundle.git");

      const response = await httpService.get<any>(
        `files/${resourceId}/?bundle`,
        { responseType: "stream" }
      );
      const buffer: Readable = response.data;

      const write = fs.createWriteStream(output.fsPath);
      buffer.pipe(write);

      let hasError = false;
      write.on("error", (error) => {
        hasError = true;
        write.close();
        reject(error);
      });

      write.on("close", () => {
        if (!hasError) {
          try {
            resolve();
          } catch (error) {
            reject(error);
          }
        }
      });
    });
  }
}
