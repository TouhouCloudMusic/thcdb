import { Micro, pipe } from "effect"
import type { Simplify } from "effect/Types"

interface Smaller {
  foo: number
}
interface Larger extends Smaller {
  bar: string
}

const fn: ({ x }: { x: Smaller }) => Micro.Micro<Larger, Error, never> = ({
  x,
}) =>
  Micro.sync(() => ({
    foo: 43,
    bar: "qux",
  }))

const task = pipe(
  Micro.sync(
    () =>
      ({
        foo: 42,
        bar: "baz",
      }) as Larger,
  ),
  Micro.bindTo("x"),
  Micro.bind("y", fn),
  Micro.tap(
    ({ x }) => console.log(x.bar), // Property 'bar' does not exist on type 'Smaller'.)
  ),
)

// add NoInfer to parameter 'a'
const myBind = Micro.bind as unknown as {
  <
    N extends Exclude<string, keyof A>,
    A extends Record<string, any>,
    B,
    E2,
    R2,
  >(
    name: N,
    f: (a: NoInfer<A>) => Micro.Micro<B, E2, R2>,
  ): <E, R>(
    self: Micro.Micro<A, E, R>,
  ) => Micro.Micro<Simplify<Omit<A, N> & { [K in N]: B }>, E | E2, R | R2>

  <
    A extends Record<string, any>,
    E,
    R,
    B,
    E2,
    R2,
    N extends Exclude<string, keyof A>,
  >(
    self: Micro.Micro<A, E, R>,
    name: N,
    f: (a: NoInfer<A>) => Micro.Micro<B, E2, R2>,
  ): Micro.Micro<Simplify<Omit<A, N> & { [K in N]: B }>, E | E2, R | R2>
}

const task2 = pipe(
  Micro.sync(
    () =>
      ({
        foo: 42,
        bar: "baz",
      }) as Larger,
  ),
  Micro.bindTo("x"),
  myBind("y", fn),
  Micro.tap(
    ({ x }) => console.log(x.bar), // ok
  ),
)
