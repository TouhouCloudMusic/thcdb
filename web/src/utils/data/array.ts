export function mapTuple<T extends readonly unknown[], U>(
	fn: (value: T[number], index: number) => U,
	tuple: T,
): { [K in keyof T]: U } {
	return tuple.map((value, index) => fn(value, index)) as { [K in keyof T]: U }
}
