type UnionToIntersection<U> =
  (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I
  : never

type LastOf<T> =
  UnionToIntersection<T extends any ? () => T : never> extends () => infer R ? R
  : never

export type ID<T> = T

export type Nilable<T> = T | null | undefined

export type UnionToTuple<
  T,
  L = LastOf<T>,
  N = [T] extends [never] ? true : false,
> = true extends N ? [] : [...UnionToTuple<Exclude<T, L>>, L]

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = Awaited<
  ReturnType<T>
>

export type LessThan<A extends number, B extends number, T extends any[] = []> =
  T["length"] extends A ?
    T["length"] extends B ?
      false
    : true
  : T["length"] extends B ? false
  : LessThan<A, B, [any, ...T]>

export type Succ<N extends number, T extends any[] = []> =
  T["length"] extends N ? [...T, any]["length"] : Succ<N, [any, ...T]>

export type SafeOmit<T extends Record<PropertyKey, any>, K extends keyof T> = {
  [P in keyof T as P extends K ? never : P]: T[P]
}
