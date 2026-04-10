import type { nil } from "../../types"
import { dual } from "../dual"

export const mapOrDefault: {
	<A, B>(self: A[] | nil, f: (x: A) => B): B[]
	<A, B>(f: (x: A) => B): (self: A[] | nil) => B[]
} = dual(2, <A, B>(self: A[] | nil, f: (x: A) => B): B[] => {
	return self?.map(f) ?? []
})

export const dedupeBy: {
	<T>(self: T[], f: (x: T) => unknown): T[]
	<T>(f: (x: T) => unknown): (self: T[]) => T[]
} = dual(2, <T>(self: T[], f: (x: T) => unknown): T[] => {
	const seen = new Set<unknown>()
	const result: T[] = []

	for (const item of self) {
		const key = f(item)

		if (!seen.has(key)) {
			seen.add(key)
			result.push(item)
		}
	}

	return result
})

export const dedupeByKey: {
	<T extends Record<K, unknown>, K extends PropertyKey>(self: T[], key: K): T[]
	<T extends Record<K, unknown>, K extends PropertyKey>(
		key: K,
	): (self: T[]) => T[]
} = dual(
	2,
	<T extends Record<K, unknown>, K extends PropertyKey>(
		self: T[],
		key: K,
	): T[] => {
		const seen = new Set<T[keyof T]>()
		const result: T[] = []

		for (const item of self) {
			const value = item[key]
			if (!seen.has(value)) {
				seen.add(value)
				result.push(item)
			}
		}

		return result
	},
)
