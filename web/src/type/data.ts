import type { If, Eq } from "."

export type nil = null | undefined

export type SafePick<T, K extends keyof T> = {
	[P in K]: T[P]
}

export type SafeOmit<T, K extends keyof T> = {
	[P in keyof T as P extends K ? never : P]: T[P]
}

/** Record */
type IsRecord<T> = T extends Record<PropertyKey, unknown> ? true : false

type UnionToIntersection<U> = (
	U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
	? I
	: never

type LastOf<T> =
	UnionToIntersection<T extends unknown ? () => T : never> extends () => infer R
		? R
		: never

export type UnionToTuple<
	T,
	L = LastOf<T>,
	N = [T] extends [never] ? true : false,
> = true extends N ? [] : [...UnionToTuple<Exclude<T, L>>, L]

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

type ReplaceInIntersection<T, From, To> = T extends infer U & From ? U & To : T

// TODO: type test
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

export type AsyncReturnType<
	T extends (...args: unknown[]) => Promise<unknown>,
> = Awaited<ReturnType<T>>
