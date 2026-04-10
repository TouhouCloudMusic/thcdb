export function toLowerCase<T extends string>(str: T): Lowercase<T> {
	// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
	return str.toLowerCase() as Lowercase<T>
}

export function capitalize<T extends string>(str: T): Capitalize<T> {
	// oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
	return (str.charAt(0).toUpperCase() + str.slice(1)) as Capitalize<T>
}
