import type { ThumbnailSize } from "~/hey-api"

export function imgUrl(
	subDir?: string | URL | null,
	size?: ThumbnailSize,
): string | undefined {
	if (subDir == null) {
		return undefined
	}
	if (subDir instanceof URL) {
		return subDir.href
	}
	if (/^[a-z][a-z\\d+.-]*:/iu.test(subDir)) {
		return subDir
	}
	const url = new URL(subDir, `${globalThis.location.origin}/api/public/image/`)
	if (size !== undefined) {
		url.searchParams.set("size", String(size))
		url.searchParams.set("v", "1")
	}
	return url.href
}
