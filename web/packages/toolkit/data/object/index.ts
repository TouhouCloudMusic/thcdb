export * from "./deep_merge"

export function merge<T extends object>(
	target: T,
	...rest: Partial<NoInfer<T>>[]
): T {
	return Object.assign(target, ...rest) as T
}

export function fromEntries<K extends PropertyKey, V>(
	entries: [K, V][],
): {
	[key in K]: V
} {
	return Object.fromEntries(entries) as Record<K, V>
}

export const pick =
	<A extends Record<PropertyKey, unknown>, Keys extends (keyof A)[]>(
		keys: Keys,
	) =>
	(obj: A): Pick<A, Keys[number]> => {
		let ret = {} as Pick<A, Keys[number]>
		for (const key of keys) {
			ret[key] = obj[key]
		}
		return ret
	}
