export type Optional<T> =
	T extends Record<PropertyKey, unknown> ? Partial<T> | null | undefined
	:	T | null | undefined
