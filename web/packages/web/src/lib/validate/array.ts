export function isEmptyArray<T>(arr: T[]): arr is [] {
	return !arr.length
}

export function isEmptyArrayOrNone<T>(
	arr: T[] | null | undefined
): arr is [] | null | undefined {
	return !arr?.length || !arr[0]
}
