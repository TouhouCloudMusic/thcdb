import { Effect as EF, Micro as M } from "effect"
import type { Effect } from "effect/Effect"
import { never } from "effect/Fiber"
import type { Micro } from "effect/Micro"
import type { Simplify } from "effect/Types"
export { io } from "fp-ts"

type GetT<T> =
  T extends Micro<infer A, unknown, unknown> ? A
  : T extends Effect<infer A, unknown, unknown> ? A
  : never

type GetE<T> =
  T extends Micro<unknown, infer E, unknown> ? E
  : T extends Effect<unknown, infer E, unknown> ? E
  : never

type GetR<T> =
  T extends Micro<unknown, unknown, infer R> ? R
  : T extends Effect<unknown, unknown, infer R> ? R
  : never

export const myM = {
  bind: M.bind as unknown as {
    <N extends string, A extends Record<string, unknown>, B, E2, R2>(
      name: N,
      f: (a: NoInfer<A>) => Micro<B, E2, R2>,
    ): <E, R>(
      self: Micro<A, E, R>,
    ) => Micro<Simplify<Omit<A, N> & { [K in N]: B }>, E | E2, R | R2>

    <A extends Record<string, unknown>, E, R, B, E2, R2, N extends string>(
      self: Micro<A, E, R>,
      name: N,
      f: (a: NoInfer<A>) => Micro<B, E2, R2>,
    ): Micro<Simplify<Omit<A, N> & { [K in N]: B }>, E | E2, R | R2>
  },
  flatMap: M.flatMap as unknown as {
    <
      A,
      MB extends Micro<unknown, unknown, unknown>,
      B extends GetT<MB>,
      E2 extends GetE<MB>,
      R2 extends GetR<MB>,
    >(
      f: (a: A) => MB,
    ): <E, R>(self: Micro<A, E, R>) => Micro<B, E | E2, R | R2>

    <
      A,
      E,
      R,
      MB extends Micro<unknown, unknown, unknown>,
      B extends GetT<MB>,
      E2 extends GetE<MB>,
      R2 extends GetR<MB>,
    >(
      self: Micro<A, E, R>,
      f: (a: A) => MB,
    ): Micro<B, E | E2, R | R2>
  },
}

export const myEffect = {
  flatMap: EF.flatMap as unknown as {
    <
      A,
      EFB extends Effect<unknown, unknown, unknown>,
      B extends GetT<EFB>,
      E1 extends GetE<EFB>,
      R1 extends GetR<EFB>,
    >(
      f: (a: A) => EFB,
    ): <E, R>(self: EF.Effect<A, E, R>) => EF.Effect<B, E1 | E, R1 | R>

    <
      A,
      E,
      R,
      EFB extends Effect<unknown, unknown, unknown>,
      B extends GetT<EFB>,
      E1 extends GetE<EFB>,
      R1 extends GetR<EFB>,
    >(
      self: EF.Effect<A, E, R>,
      f: (a: A) => EFB,
    ): EF.Effect<B, E | E1, R | R1>
  },

  bind: EF.bind as any as {
    <N extends string, A extends object, B, E2, R2>(
      name: Exclude<N, keyof A>,
      f: (a: NoInfer<A>) => Effect<B, E2, R2>,
    ): <E1, R1>(
      self: Effect<A, E1, R1>,
    ) => Effect<
      { [K in N | keyof A]: K extends keyof A ? A[K] : B },
      E2 | E1,
      R2 | R1
    >

    <A extends object, N extends string, E1, R1, B, E2, R2>(
      self: Effect<A, E1, R1>,
      name: Exclude<N, keyof A>,
      f: (a: A) => Effect<B, E2, R2>,
    ): Effect<
      { [K in N | keyof A]: K extends keyof A ? A[K] : B },
      E1 | E2,
      R1 | R2
    >
  },
}
