export function isCallbackUrl(s: string) {
	return s.startsWith('joplin://x-callback-url/');
}

export function getNoteUrl(noteId: string) {
	return `joplin://x-callback-url/openNote?id=${encodeURIComponent(noteId)}`;
}

export function getFolderUrl(folderId: string) {
	return `joplin://x-callback-url/openFolder?id=${encodeURIComponent(folderId)}`;
}

export function getTagUrl(tagId: string) {
	return `joplin://x-callback-url/openTag?id=${encodeURIComponent(tagId)}`;
}

export enum Command {
    openNote = 'openNote',
    openFolder = 'openFolder',
    openTag = 'openTag',
}

export interface CallbackUrlInfo {
    command: Command;
    params: Record<string, string>;
}

export function parseCallbackUrl(s: string): CallbackUrlInfo {
	if (!isCallbackUrl(s)) throw new Error(`Invalid callback url ${s}`);
	const url = new URL(s);

	const params: Record<string, string> = {};
	for (const [key, value] of url.searchParams) {
		params[key] = value;
	}

	return {
		command: url.pathname.substring(url.pathname.lastIndexOf('/') + 1) as Command,
		params,
	};
}
