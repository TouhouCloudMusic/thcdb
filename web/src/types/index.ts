// oxlint-disable no-magic-numbers
export * from "./data"
export * from "./control_flow"

type Not<B extends boolean> = B extends true ? false : true
type And<A extends boolean, B extends boolean> = A extends true ? B : false

export type IsArray<T> =
	T extends unknown[] ?
		number extends T["length"] ?
			true
		:	false
	:	false

export type IsRecord<T, K extends PropertyKey = PropertyKey> =
	T extends Record<K, unknown> ? true : false

export type IsNullable<T> = T extends infer _ | null ? true : false

export type IsUndefinable<T> = T extends infer _ | undefined ? true : false

export type IsOptionalKey<T, K extends keyof T> =
	Record<string, never> extends Pick<T, K> ? true : false

export type Id<T> = T
export type Extend<A, B> = A extends B ? true : false
export type Eq<A, B> = Extend<A, B> & Extend<B, A>

export type If<Cond extends boolean, T, F> = Cond extends true ? T : F

type ControlFlowIf = {
	if: boolean
	then: unknown
	else: unknown
}

type ControlFlow<T extends ControlFlowIf> =
	T["if"] extends true ? T["then"] : T["else"]

export type Replace<T, A, B> = If<
	IsRecord<T>,
	{
		[K in keyof T]: ControlFlow<{
			if: IsRecord<T[K]>
			then: Replace<T[K], A, B>
			else: If<Eq<T[K], A>, B, T[K]>
		}>
	},
	ReplaceInIntersection<T, A, B>
>

type ReplaceInIntersection<T, From, To> = T extends infer U & From ? U & To : T

type ReplaceTest1 = Replace<{ a: 1 }, 1, 2>
const ReplaceTest1: ReplaceTest1 = { a: 2 }
type ReplaceTest1Nested = Replace<
	{
		a: 1
		b: {
			c: 1
		}
	},
	1,
	2
>
const ReplaceTest1Nested: ReplaceTest1Nested = {
	a: 2,
	b: {
		c: 2,
	},
}

type ReplaceTest2 = ReplaceInIntersection<number & Blob, Blob, File>
const ReplaceTest2: ReplaceTest2 extends number & File ? true : false = true
type ReplaceTest3 = ReplaceInIntersection<number | Blob, Blob, File>
const ReplaceTest3: ReplaceTest3 extends number | File ? true : false = true

export interface TypeError<T extends string> {
	readonly __typeError__: T
}

export type NestedPartial<T> = {
	[K in keyof T]?: NonNullable<T[K]> extends Record<string, unknown> ?
		NestedPartial<NonNullable<T[K]>>
	:	NonNullable<T[K]> | undefined
}
export type Expand<O> =
	O extends never ? never
	: O extends infer T ?
		T extends Record<string, unknown> ?
			{
				[K in keyof T]: NonNullable<T[K]> extends never ? never
				:	ControlFlow<{
						if: IsRecord<T[K]>
						then: Expand<T[K]>
						else: NonNullable<T[K]> extends unknown[] ?
							| Expand<NonNullable<T[K]>[number]>[]
							| If<IsUndefinable<Required<T>[K]>, undefined, never>
							| If<IsNullable<T[K]>, null, never>
						:	T[K]
					}>
			}
		:	T
	:	never

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
	[K in keyof T]: ControlFlow<{
		if: IsRecord<NonNullable<T[K]>, string>
		then: RevExactRecursive<T[K]>
		else: NonNullable<T[K]> extends never ? never
		: NonNullable<T[K]> extends unknown[] ?
			| RevExactRecursive<NonNullable<T[K]>[number]>[]
			| If<IsNullable<T[K]>, null, never>
			| If<And<IsUndefinable<T[K]>, Not<IsOptionalKey<T, K>>>, undefined, never>
		:	T[K]
	}> extends infer result ?
		| result
		| ControlFlow<{
				if: IsOptionalKey<T, K> | IsUndefinable<T[K]>
				then: undefined
				else: never
		  }>
	:	never
}
