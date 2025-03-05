export function isEmptyArray<T>(arr: T[]): arr is [] {
  return arr.length === 0
}

export function isNotEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return arr.length > 0
}

export function isEmptyOrNone<T>(
  arr: Array<T> | null | undefined,
): arr is [] | null | undefined {
  return arr == null || arr.length === 0
}

export function isNotEmptyOrNone<T>(
  arr: Array<T> | null | undefined,
): arr is [NonNullable<T>, ...NonNullable<T>[]] {
  return arr != null && arr.length > 0
}
