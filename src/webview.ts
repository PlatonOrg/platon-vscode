
import * as vscode from "vscode";

export function getWebviewContent(resourceId: string, context: vscode.ExtensionContext): string {
    // const accessToken = context.secrets.get("accessToken");
    // const refreshToken = context.secrets.get("refreshToken");
	const externalUrl = `${vscode.workspace.getConfiguration("platon").get<string>("baseUrl")}/player/preview/${resourceId}?version=latest&editor-preview=true`; // &accessToken=${accessToken}&refreshToken=${refreshToken}`;
    console.log(externalUrl);
    const allowedOrigin = vscode.workspace.getConfiguration("platon").get<string>("baseUrl") || "https://platon-preprod.univ-eiffel.fr/";

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Live Preview</title>
		<link rel="icon" type="image/x-icon" href="https://platon-preprod.univ-eiffel.fr/assets/images/logo/platon.svg">
        <style>
            body { margin: 0; padding: 0; display: flex; height: 100vh; }
            iframe { width: 100%; height: 100%; border: none; }
        </style>
        <meta
            http-equiv="Content-Security-Policy"
            content="default-src 'none'; 
            script-src 'unsafe-inline' 'unsafe-eval'; 
            style-src 'unsafe-inline'; 
            frame-src ${allowedOrigin};">
    </head>
    <body>
        <script>
            console.log(window.origin);
            console.log("ancestorOrigins");
            console.log(document.location.ancestorOrigins);
        </script>
        <iframe src="${externalUrl}"></iframe>
    </body>
    </html>`;
}