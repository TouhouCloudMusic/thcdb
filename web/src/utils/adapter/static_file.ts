export function imgUrl(subDir?: string | URL | null): string | undefined {
	if (subDir == null) {
		return undefined
	}
	const base =
		import.meta.env.VITE_SERVER_URL
		?? globalThis.location?.origin
		?? "http://localhost:3000"
	const url = new URL(subDir, new URL("api/public/image/", base))
	return url.href
}
