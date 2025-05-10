export * from "./data"
export * from "./control_flow"

export type Id<T> = T
export type PartialEq<A, B> = A extends B ? true : false
export type Eq<A, B> = PartialEq<A, B> & PartialEq<B, A>

export type If<Cond extends boolean, T, F> = Cond extends true ? T : F

export type Replace<T, A, B> = If<
	IsRecord<T>,
	{
		[K in keyof T]: If<
			IsRecord<T[K]>,
			Replace<T[K], A, B>,
			If<Eq<T[K], A>, B, T[K]>
		>
	},
	ReplaceInIntersection<T, A, B>
>

type IsRecord<T> = T extends Record<PropertyKey, unknown> ? true : false

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
export type Expand<T> = T extends unknown ? { [K in keyof T]: T[K] } : never
