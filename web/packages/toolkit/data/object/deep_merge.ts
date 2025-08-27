type Eq<A, B> = A extends B ? (B extends A ? true : false) : false

type PlainObject = Record<string, unknown>
export type DeepMerge<
	Objects extends PlainObject[],
	Result = {},
> = Objects extends [...infer Rest, infer Last]
	? Last extends PlainObject
		? Rest extends PlainObject[]
			? DeepMerge<
					Rest,
					{
						[K in keyof Result | keyof Last]: K extends keyof Last
							? K extends keyof Result
								? Last[K] extends PlainObject
									? Result[K] extends PlainObject
										? DeepMerge<[Result[K], Last[K]]>
										: Last[K]
									: Eq<Last[K], undefined> extends true
										? Result[K]
										: Last[K]
								: Last[K]
							: K extends keyof Result
								? Result[K]
								: never
					}
				>
			: never
		: never
	: Result

export function deepMerge<
	const T extends PlainObject,
	const U extends PlainObject[],
>(target: T, ...source: U): DeepMerge<[T, ...U]> {
	if (source.length === 0) {
		return target as any
	}
	if (source.length === 1) {
		return mergeTwoMut(structuredClone(target), source[0]!)
	}
	let ret = structuredClone(target) as unknown as DeepMerge<[T, ...U]>
	for (const s of source) {
		ret = mergeTwoMut(ret, s)
	}
	return ret
}

function mergeTwoMut(target: PlainObject, source: PlainObject): any {
	for (const key in source) {
		if (isPlainObject(source[key]) && !Array.isArray(source)) {
			if (!target[key]) {
				target[key] = {}
			}
			mergeTwoMut(target[key] as PlainObject, source[key])
		} else {
			target[key] = source[key]
		}
	}
	return target
}

function isPlainObject(obj: any): obj is PlainObject {
	return (
		obj !== null
		&& typeof obj === "object"
		&& Object.prototype.toString.call(obj) === "[object Object]"
	)
}

// test

type Obj1 = {
	a: number
	nested: {
		b: string
		c: { d: boolean }
	}
}
type Obj2 = {
	nested: {
		b: number
		e: string
	}
	f: number[]
}

type Merged = DeepMerge<[Obj1, Obj2]>
type IsOk = Eq<
	Merged,
	{
		a: number
		nested: {
			b: number
			c: { d: boolean }
			e: string
		}
		f: number[]
	}
>
const isOk: IsOk = true
