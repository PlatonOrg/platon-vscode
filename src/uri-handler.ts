import * as vscode from 'vscode';
import { User } from './models/user';
import { getUserInformations } from './services/auth-service';
import { FileService } from './services/file-service';
import { capitalize } from './utils';

export async function handleUri(uri: vscode.Uri, context: vscode.ExtensionContext, fileServiceMap: Map<string, FileService>): Promise<void> {
	const query = new URLSearchParams(uri.query);
	const accessToken = query.get("access-token");
	const refreshToken = query.get("refresh-token");
	const resource = query.get("resource") ?? '';

	if (accessToken && refreshToken) {
		vscode.window.showInformationMessage(vscode.l10n.t('Authentication in progress...'));
		context.secrets.store("accessToken", accessToken);
		context.secrets.store("refreshToken", refreshToken);

		const user: User = await getUserInformations(context);
		context.globalState.update("user", user);
		vscode.window.showInformationMessage(vscode.l10n.t('Authentication to PLaTOn successful. Welcome {name} !', { name: capitalize(user.firstName) }));
		const { fs } = vscode.workspace;
		try {
			await fs.delete(context.globalStorageUri, { recursive: true, useTrash: false });
		} catch (error) {
			console.error(error);
		}
		await fs.createDirectory(context.globalStorageUri);
		if (resource) {
			const fileService = await FileService.instance(resource);
			fileServiceMap.set(resource, fileService);
			await context.globalState.update("fileService", fileService);
		}
	} else {
		vscode.window.showErrorMessage(vscode.l10n.t('Authentication failed'));
	}
}