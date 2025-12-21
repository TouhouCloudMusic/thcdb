// TODO: ts 5.9 control flow generics
export function imgUrl<T extends string | URL>(
	subDir?: T | null,
): T extends undefined | null ? undefined | null : string {
	if (!subDir) {
		return undefined as T extends undefined | null ? undefined | null : string
	}
	const url = new URL(
		subDir,
		new URL("public/image/", import.meta.env.VITE_SERVER_URL),
	)
	return url.href as T extends undefined | null ? undefined | null : string
}
