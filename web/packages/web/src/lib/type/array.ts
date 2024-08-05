export type IndexOf<T> = T extends Array<infer K> ? K : never

export type NonEmptyArray<T> = [T, ...T[]]
