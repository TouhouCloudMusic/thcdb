export function todo(msg?: string): never {
	throw new Error(msg ?? "TODO")
}
