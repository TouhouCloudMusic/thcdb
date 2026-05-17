export function imgUrl(subDir?: string | URL | null): string | undefined {
	if (subDir == null) {
		return undefined
	}
	if (subDir instanceof URL) {
		return subDir.href
	}
	if (/^[a-z][a-z\\d+.-]*:/iu.test(subDir)) {
		return subDir
	}
	return new URL(subDir, `${globalThis.location.origin}/api/public/image/`).href
}
