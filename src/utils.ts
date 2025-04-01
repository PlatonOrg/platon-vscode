import * as vscode from 'vscode';

export function capitalize(s: string): string {
	/** 
	 * Capitalize the first letter of a string and lowercase the rest
	 * @param s The string to capitalize
	 * @returns The capitalized string
	 */
	return s.charAt(0).toUpperCase() + s.slice(1).toLocaleLowerCase();
}


export const getResource = (uri: vscode.Uri): vscode.Uri & {resourceId: string} | undefined => {
	/**
	 * Retrieves a resource object based on the provided URI. The resource object
	 * includes the original URI and an additional `resourceId` property, which is
	 * derived from the workspace folder containing the URI.
	 *
	 * @param uri - The URI to locate within the workspace folders.
	 * @returns A combined `vscode.Uri` object with an additional `resourceId` property
	 *          if the URI belongs to a workspace folder, or `undefined` if no match is found.
	 */
	let resource: (vscode.Uri & { resourceId: string }) | undefined;
	for (const folder of vscode.workspace.workspaceFolders ?? []) {
		if (uri.path.startsWith(folder.uri.path)) {
			const resourceId = folder.uri.path.split('/').pop() || '';
			resource = Object.assign(folder.uri, { resourceId });
			break;
		}
	}
	return resource;
};

export const resolveFileReference = (path: string, relativeTo: { resource: string; version?: string }) => {
	path = path.trim();
	if (!path.startsWith('/')) {
	  if (path.startsWith(':')) {
		const [version, ...rest] = path.split('/');
		path = `/relative${version}/${rest.join('/')}`;
	  } else {
		path = `/relative/${path}`;
	  }
	}
	const tokens = path.split(' as ');
  
	path = tokens[0].trim();
	const alias = tokens[1]?.trim();
  
	const parts = path.split('/').filter((e) => !!e.trim());
	let [resource, version] = parts[0].split(':');
	path = parts.slice(1).join('/');
  
	version = (resource === 'relative' ? version ?? relativeTo.version : version) || 'latest';
	resource = resource === 'relative' ? relativeTo.resource : resource;
  
	return {
	  alias,
	  resource,
	  version,
	  relpath: path,
	  abspath: `${resource}:${version}/${path}`,
	};
};