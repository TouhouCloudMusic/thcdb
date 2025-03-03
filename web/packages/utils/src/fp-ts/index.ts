import { either as E, extend, identity, taskEither as TE } from "fp-ts"
import type { TaskEither } from "fp-ts/TaskEither"

type GetLeft<E> =
  E extends E.Left<infer L> ? L
  : E extends TE.TaskEither<infer L, unknown> ? L
  : never

type GetRight<E> =
  E extends E.Right<infer R> ? R
  : E extends TE.TaskEither<unknown, infer R> ? R
  : never

export const myE = {
  chain: E.chain as unknown as <
    E1,
    A,
    EB extends E.Either<unknown, unknown>,
    E2 extends GetLeft<EB>,
    B extends GetRight<EB>,
  >(
    f: (a: A) => EB,
  ) => (ma: TaskEither<E1, A>) => TE.TaskEither<E1 | E2, B>,
}

export const myTE = {
  bind: TE.bindW as unknown as <
    N extends string,
    TEA,
    E1 extends GetLeft<TEA>,
    A extends GetRight<TEA>,
    E2,
    B,
  >(
    name: Exclude<N, keyof A>,
    f: (a: A) => TaskEither<E2, B>,
  ) => (fa: TEA) => TaskEither<
    E1 | E2,
    {
      readonly [K in keyof A | N]: K extends keyof A ? A[K] : B
    }
  >,
  flatMap: TE.chain as unknown as <
    A,
    TEB extends TE.TaskEither<unknown, unknown>,
    E2 extends GetLeft<TEB>,
    B extends GetRight<TEB>,
  >(
    f: (a: A) => TEB,
  ) => <E1>(ma: TaskEither<E1, A>) => TE.TaskEither<E1 | E2, B>,
  unwrap: <E, A>(fa: TaskEither<E, A>) =>
    TE.matchW(identity.of, identity.of)(fa),
}
