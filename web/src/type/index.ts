import type { If } from "./control_flow"

// oxlint-disable no-magic-numbers
export * from "./data"
export * from "./control_flow"

type Not<B extends boolean> = B extends true ? false : true
type And<A extends boolean, B extends boolean> = A extends true ? B : false

export type IsArray<T> = T extends unknown[]
	? number extends T["length"]
		? true
		: false
	: false

export type IsRecord<T, K extends PropertyKey = PropertyKey> =
	T extends Record<K, unknown> ? true : false

export type IsNullable<T> = null extends T ? true : false

export type IsUndefinable<T> = undefined extends T ? true : false

export type IsOptionalKey<T, K extends keyof T> =
	Record<string, never> extends Pick<T, K> ? true : false

export type Id<T> = T
export type Extend<A, B> = A extends B ? true : false
export type Eq<A, B> = Extend<A, B> & Extend<B, A>

type ControlFlowIf = {
	if: boolean
	then: unknown
	else: unknown
}

type ControlFlow<T extends ControlFlowIf> = T["if"] extends true
	? T["then"]
	: T["else"]

export interface TypeError<T extends string> {
	readonly __typeError__: T
}

export type NestedPartial<T> = {
	[K in keyof T]?: NonNullable<T[K]> extends Record<string, unknown>
		? NestedPartial<NonNullable<T[K]>>
		: NonNullable<T[K]> | undefined
}
export type Expand<O> = O extends never
	? never
	: O extends infer T
		? T extends Record<string, unknown>
			? {
					[K in keyof T]: NonNullable<T[K]> extends never
						? never
						: ControlFlow<{
								if: IsRecord<T[K]>
								then: Expand<T[K]>
								else: NonNullable<T[K]> extends unknown[]
									?
											| Expand<NonNullable<T[K]>[number]>[]
											| If<IsUndefinable<Required<T>[K]>, undefined, never>
											| If<IsNullable<T[K]>, null, never>
									: T[K]
							}>
				}
			: T
		: never

/**
 * Make optional key also undefined
 */
export type RevExact<T> = {
	[K in keyof T]: If<IsOptionalKey<T, K>, T[K] | undefined, T[K]>
}

/**
 * Make optional key also undefined, recursively
 */
export type RevExactRecursive<T> = {
	[K in keyof T]: If<
		IsRecord<NonNullable<T[K]>, string>,
		RevExactRecursive<T[K]>,
		NonNullable<T[K]> extends never
			? never
			: NonNullable<T[K]> extends unknown[]
				?
						| RevExactRecursive<NonNullable<T[K]>[number]>[]
						| If<IsNullable<T[K]>, null, never>
						| If<
								And<IsUndefinable<T[K]>, Not<IsOptionalKey<T, K>>>,
								undefined,
								never
						  >
				: T[K]
	> extends infer result
		? result | If<IsOptionalKey<T, K> | IsUndefinable<T[K]>, undefined, never>
		: never
}
