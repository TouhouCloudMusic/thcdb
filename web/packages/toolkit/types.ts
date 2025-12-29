export type VoidFn<Args extends unknown[] = []> = (...args: Args) => void

type KeyOfArrayOfRecord<T extends Record<string, unknown>[]> =
	T[number] extends infer U
		? U extends Record<string, unknown>
			? keyof U
			: never
		: never

export type ADTEnum<
	T extends Record<string, unknown>[],
	AllKeys extends PropertyKey = KeyOfArrayOfRecord<T>,
> = T extends [infer Head, ...infer Tail]
	? Head extends Record<string, unknown>
		? Tail extends Record<string, unknown>[]
			? {
					[K in keyof Head]: Head[K]
				} & { [K in Exclude<AllKeys, keyof Head>]?: never } extends infer Result
				? // flatten
						| {
								[Key in keyof Result]: Result[Key]
						  }
						| ADTEnum<Tail, AllKeys>
				: never
			: never
		: never
	: never

type ADTTest1 = ADTEnum<[{ a: string }, { b: number }]>
// 期望 -> { a: string; b?: never } | { a?: never; b: number }

type ADTTest2 = ADTEnum<
	[{ a: string; share: number }, { b: number; share?: number }]
>

export type nil = null | undefined
