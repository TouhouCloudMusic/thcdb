export function merge<T extends object>(target: T, ...rest: Partial<T>[]): T {
	return Object.assign(target, ...rest) as T
}

export function fromEntries<K extends PropertyKey, V>(
	entries: [K, V][],
): {
	[key in K]: V
} {
	return Object.fromEntries(entries) as Record<K, V>
}
