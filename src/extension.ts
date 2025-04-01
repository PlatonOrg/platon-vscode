import * as vscode from 'vscode';
import { FileService } from './services/file-service';
import { join } from 'path';
import { getResource, resolveFileReference } from './utils';
import { getWebviewContent } from './webview';
import { handleUri } from './uri-handler';
import { setState } from './utils/state';

export function activate(context: vscode.ExtensionContext) {
	setState("context", context);
	vscode.languages.registerDocumentLinkProvider({ language: 'ple' }, {
		provideDocumentLinks(document) {
			const linkPattern = /#(docs\/(?:main|components)(?:\/[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=]*)?)/g;
			const text = document.getText();
			const links: vscode.DocumentLink[] = [];
			let match;
			while ((match = linkPattern.exec(text)) !== null) {
				const start = document.positionAt(match.index);
				const end = document.positionAt(match.index + match[0].length);
				const range = new vscode.Range(start, end);
				const target = vscode.Uri.parse(`https://platon.univ-eiffel.fr/${match[1]}`);
				links.push(new vscode.DocumentLink(range, target));
			}
			return links;
		}
	});

	vscode.languages.registerDocumentLinkProvider({ language: 'ple' }, {
		provideDocumentLinks(document) {
			const MULTI_LINE_PATTERN = /^[a-zA-Z_](\.?\w+)*\s*==/;
			const END_MULTI_LINE_PATTERN = /^==\s*$/;
			const REFERENCE_PATTERN = /(@(?:extends|copyurl|copycontent|include)\s+)([^\s]+)/;
			const links: vscode.DocumentLink[] = [];
			const text = document.getText();
			const lines = text.split('\n');
			let isMultiLine = false;
			let match;

			for (let i = 0; i < lines.length; i++) {
				const line = lines[i];
				if (isMultiLine) {
					if (END_MULTI_LINE_PATTERN.test(line)) {
						isMultiLine = false;
					} else {
						continue;
					}
				} else if (MULTI_LINE_PATTERN.test(line)) {
					isMultiLine = true;
				} else {
					match = REFERENCE_PATTERN.exec(line);
					if (match) {
						const currentRessource = getResource(document.uri)!;
						const currentRessourceId = currentRessource.resourceId;
						const reference = resolveFileReference(match[2], { resource: currentRessourceId, version: "latest" });
						if (reference.resource !== currentRessourceId) {
							// Not supported yet
							continue;
						}
						const start = new vscode.Position(i, match.index + match[1].length);
						const end = start.translate(0, match[2].length);
						const range = new vscode.Range(start, end);
						const target = vscode.Uri.parse(currentRessource.with({path: `${currentRessource.path}/${reference.relpath}`}).toString());
						links.push(new vscode.DocumentLink(range, target));
					}
				}
			}
			return links;
		}
	});


	const webviewPanelMap = new Map<string, vscode.WebviewPanel>();
	const fileServiceMap = new Map<string, FileService>();

	let registerUriHandler = vscode.window.registerUriHandler({
		handleUri: async (uri: vscode.Uri) => {
			await handleUri(uri, context, fileServiceMap);
		}
	});
	context.subscriptions.push(registerUriHandler);

	context.subscriptions.push(vscode.commands.registerCommand('platon.connect', async () => {
		vscode.window.showInformationMessage(vscode.l10n.t('Authentication in progress...'));
		const uri = vscode.Uri.parse(vscode.workspace.getConfiguration("platon").get<string>("baseUrl") + 
		`login?callbackUrl=${vscode.env.uriScheme}://${context.extension.id}/authentification&callbackTitle=${vscode.env.appName}`);
		vscode.env.openExternal(uri);
	}));

	context.subscriptions.push(vscode.commands.registerCommand('platon.openRessource', async () => {
		const resourceId = await vscode.window.showInputBox({
			prompt: vscode.l10n.t('Enter the resource ID'), 
			placeHolder: vscode.l10n.t('01234567-89ab-cdef-aaaa-0123456789ab'), 
		});
		if (!resourceId) {
			return;
		}
		const fileService = await FileService.instance(resourceId);
		fileServiceMap.set(resourceId, fileService);
	}));


	context.subscriptions.push(vscode.commands.registerCommand('platon.sync', async (uri: vscode.Uri) => {
		try {
			if (uri) {
				// If a URI is provided, sync the specific resource
				const resourceId = getResource(uri)?.resourceId;
				if (!resourceId) {
					vscode.window.showErrorMessage(vscode.l10n.t('You must open a resource within a workspace folder to use this command.'));
					return;
				}
				const fileService = await FileService.instance(resourceId);
				await fileService.sync(resourceId);
				return;
			}
			// If no URI is provided, sync all resources
			for (const resourceId of vscode.workspace.workspaceFolders?.map(folder => folder.uri.path.split('/').pop()) ?? []) {
				if (!resourceId) {
					vscode.window.showErrorMessage(vscode.l10n.t('You must open a resource within a workspace folder to use this command.'));
					return;
				}
				const fileService = await FileService.instance(resourceId);
				await fileService.sync(resourceId);
			}
		} catch (error: any) {
			vscode.window.showErrorMessage(error.message);
		}
	}));

	context.subscriptions.push(vscode.commands.registerCommand('platon.preview', async () => {
		const activeEditor = vscode.window.activeTextEditor;
		if (!activeEditor) {
			vscode.window.showErrorMessage(vscode.l10n.t('You must open a resource to preview'));
			return;
		}
		const resourceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
		if (!resourceFolder) {
			vscode.window.showErrorMessage(vscode.l10n.t('You must open a resource within a workspace folder to use this command.'));
			return;
		}
		const resourceId = resourceFolder.uri.path.split('/').pop();
		const resourceName = resourceFolder.name;
		if (!resourceId || !resourceName) {
			vscode.window.showErrorMessage(vscode.l10n.t('Invalid resource folder.'));
			return;
		}
		const fileService = await FileService.instance(resourceId);
		await fileService.sync(resourceId);

		let panel = webviewPanelMap.get(resourceId);

		if (panel) {
			panel.reveal(vscode.ViewColumn.Beside);
			panel.webview.html += " ";
			return;
		}

		panel = vscode.window.createWebviewPanel(
			`platonPreview${resourceId}`,
			vscode.l10n.t('PLaTOn Preview {resourceName}', {resourceName}),
			vscode.ViewColumn.Beside,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
			}
		);

		panel.onDidDispose(() => {
			webviewPanelMap.delete(resourceId);
		}, null, context.subscriptions);

		panel.iconPath = {
			light: vscode.Uri.file(join(context.extensionPath, 'icons', 'ple-icon.svg')),
			dark: vscode.Uri.file(join(context.extensionPath, 'icons', 'ple-icon.svg'))
		};

		webviewPanelMap.set(resourceId, panel);

		panel.webview.html = getWebviewContent(resourceId, context);

	}));

	vscode.languages.registerCompletionItemProvider(
		{ language: 'ple' },
		{
			provideCompletionItems(document, position) {
				const completionItems: vscode.CompletionItem[] = [];
				const reservedVariables = ['title', 'form', 'hint', 'theories', 'statement', 'grader', 'builder', 'solution', 'sandbox'];
				reservedVariables.forEach(variable => {
					const item = new vscode.CompletionItem(variable, vscode.CompletionItemKind.Variable);
					item.detail = 'Reserved variable';
					completionItems.push(item);
				});
				return completionItems;
			},
		}
	);

	vscode.languages.registerHoverProvider({ language: 'ple' }, {
		provideHover(document, position) {
			const word = document.getText(document.getWordRangeAtPosition(position));
			let markdownString = '';
			switch (word) {
				case 'grader':
					markdownString = vscode.l10n.t('Defines a grader block.\n\n[documentation](https://localhost/docs/main/programing/exercise/workflow#%C3%A9valuation-grader)');
					break;
				case 'builder':
					markdownString = vscode.l10n.t('Defines a builder block.\n\n[documentation](https://localhost/docs/main/programing/exercise/workflow#construction-builder)');
					break;
				case 'extends':
					markdownString = vscode.l10n.t('Extends a resource.\n\n[documentation](https://localhost/docs/main/programing/exercise/langage#h%C3%A9ritage-et-composition)');
					break;
				case 'copyurl':
					markdownString = vscode.l10n.t('Copies the file\'s URL in the variable.\n\n[documentation](https://localhost/docs/main/programing/exercise/langage#r%C3%A9f%C3%A9rences-de-fichiers)');
					break;
				case 'copycontent':
					markdownString = vscode.l10n.t('Copies the file\'s content in the variable.\n\n[documentation](https://localhost/docs/main/programing/exercise/langage#r%C3%A9f%C3%A9rences-de-fichiers)');
					break;
				case 'include':
					markdownString = vscode.l10n.t('Includes a file in the sandbox environment.\n\n[documentation](https://localhost/docs/main/programing/exercise/langage#inclusion-de-fichiers)');
					break;
				case 'theories':
					markdownString = vscode.l10n.t('Array of pedagogical resources for the student.\n\n[documentation](https://localhost/docs/main/doc/programing/exercise/theories)');
					break;
				case 'hint':
					markdownString = vscode.l10n.t('Array or Object for the hints.\n\n[documentation](https://localhost/docs/main/programing/exercise/workflow#environnement-dex%C3%A9cution--sandbox)');
					break;
				case 'sandbox': 
					markdownString = vscode.l10n.t('Sandbox environment `python` or `node`.\n\n[documentation](https://localhost/docs/main/programing/exercise/workflow#environnement-dex%C3%A9cution--sandbox)');
					break;
				default:
					markdownString = '';
					break;
			}
			if (markdownString) {
				return new vscode.Hover(new vscode.MarkdownString(markdownString));
			}
			return null;
		},
	});
}

// This method is called when your extension is deactivated
export function deactivate() {}