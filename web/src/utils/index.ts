export function tw(cls: string) {
	return cls.replaceAll(/\s+/gu, " ").trim()
}

export function todo(msg?: string): never {
	throw new Error(msg ?? "TODO")
}
