// oxlint-disable typescript-eslint/no-unsafe-type-assertion
export * from "./deep_merge"

export function merge<T extends object>(
	target: T,
	...rest: Partial<NoInfer<T>>[]
): T {
	return Object.assign(target, ...rest) as T
}

export function fromEntries<K extends PropertyKey, V>(
	entries: [K, V][],
): Record<K, V> {
	return Object.fromEntries(entries) as Record<K, V>
}

export function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function pick<
	A extends Record<PropertyKey, unknown>,
	Keys extends (keyof A)[],
>(keys: Keys): (obj: A) => Pick<A, Keys[number]> {
	return (obj: A): Pick<A, Keys[number]> => {
		const ret = {} as Pick<A, Keys[number]>
		for (const key of keys) {
			ret[key] = obj[key]
		}
		return ret
	}
}
