export function isEmptyArray<T>(arr: T[]): arr is [] {
	return !arr.length
}

export function isEmptyArrayOrNone(
	arr: Array<unknown> | null | undefined
): arr is [] | null | undefined {
	return !arr?.length || !arr[0]
}
