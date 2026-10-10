import type { nil } from "../types"

export function map<T, Output>(
	f: (value: NonNullable<T>) => Output,
	value: T | nil,
): Output | undefined {
	return value == null ? undefined : f(value)
}

export function mapOr<T, Output, Fallback>(
	fallback: Fallback,
	f: (value: NonNullable<T>) => Output,
	value: T | nil,
): Output | Fallback {
	return value == null ? fallback : f(value)
}

export function filter<T>(
	predicate: (value: NonNullable<T>) => boolean,
	value: T | nil,
): NonNullable<T> | undefined {
	return value != null && predicate(value) ? value : undefined
}
