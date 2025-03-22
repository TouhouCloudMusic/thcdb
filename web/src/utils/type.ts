type UnionToIntersection<U> =
  (U extends unknown ? (k: U) => void : never) extends (k: infer I) => void ? I
  : never

type LastOf<T> =
  UnionToIntersection<T extends unknown ? () => T : never> extends (
    () => infer R
  ) ?
    R
  : never

export type ID<T> = T

export type Nilable<T> = T | null | undefined

export type UnionToTuple<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false,
> = true extends N ? [] : [...UnionToTuple<Exclude<T, L>>, L]

export type AsyncReturnType<
  T extends (...args: unknown[]) => Promise<unknown>,
> = Awaited<ReturnType<T>>

export type LessThan<
  A extends number,
  B extends number,
  T extends unknown[] = [],
> =
  T["length"] extends A ?
    T["length"] extends B ?
      false
    : true
  : T["length"] extends B ? false
  : LessThan<A, B, [unknown, ...T]>

export type Succ<N extends number, T extends unknown[] = []> =
  T["length"] extends N ? [...T, unknown]["length"] : Succ<N, [unknown, ...T]>

export type SafeOmit<T, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
}
