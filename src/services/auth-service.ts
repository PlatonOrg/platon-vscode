import * as vscode from 'vscode';
import HttpService from './http-service';
import { jwtDecode } from 'jwt-decode';
import { User } from '../models/user';

export async function authenticateUser() {
    const authUrl = `${vscode.workspace.getConfiguration("platon").get<string>("baseUrl")}/login?callbackUrl=vscode-insiders://undefined_publisher.platon/authentification&callbackTitle=VSCode`;  
    vscode.env.openExternal(vscode.Uri.parse(authUrl));
}


export async function getUserInformations(context: vscode.ExtensionContext) : Promise<User> {
    const httpService = await HttpService.instance();
    const accessToken = await context.secrets.get("accessToken");
    if (!accessToken) {
        throw new Error("Access token not found.");
    }
    const payload = jwtDecode<{username : string}>(accessToken);
    if (! payload.username) {
        throw new Error("Username not found in the token.");
    }
    const username = payload.username;
    try {
        const response = await httpService.get<{resource : User}>(`users/${username}`);
        const user = response.data.resource;
        return user;
    }
    catch (error) {
        console.error(error);
        throw new Error("An error occured while fetching user informations.");
    }
}
