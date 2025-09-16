export const id = <A>(x: A): A => x
// oxlint-disable max-params
// eslint-disable no-magic-numbers
export function pipe<A, B>(x: A, fn: (x: A) => B): B
export function pipe<A, B, C>(x: A, fn: (x: A) => B, fn2: (x: B) => C): C
export function pipe<A, B, C, D>(
	x: A,
	fn: (x: A) => B,
	fn2: (x: B) => C,
	fn3: (x: C) => D,
): D
export function pipe<A, B, C, D, E>(
	x: A,
	fn: (x: A) => B,
	fn2: (x: B) => C,
	fn3: (x: C) => D,
	fn4: (x: D) => E,
): E
export function pipe<A, B, C, D, E, F>(
	x: A,
	fn: (x: A) => B,
	fn2: (x: B) => C,
	fn3: (x: C) => D,
	fn4: (x: D) => E,
	fn5: (x: E) => F,
): F
export function pipe<A, B, C, D, E, F, G>(
	x: A,
	fn: (x: A) => B,
	fn2: (x: B) => C,
	fn3: (x: C) => D,
	fn4: (x: D) => E,
	fn5: (x: E) => F,
	fn6: (x: F) => G,
): G
export function pipe<A, B, C, D, E, F, G, H>(
	x: A,
	fn: (x: A) => B,
	fn2: (x: B) => C,
	fn3: (x: C) => D,
	fn4: (x: D) => E,
	fn5: (x: E) => F,
	fn6: (x: F) => G,
	fn7: (x: G) => H,
): H
export function pipe<A, B, C, D, E, F, G, H, I>(
	x: A,
	fn: (x: A) => B,
	fn2: (x: B) => C,
	fn3: (x: C) => D,
	fn4: (x: D) => E,
	fn5: (x: E) => F,
	fn6: (x: F) => G,
	fn7: (x: G) => H,
	fn8: (x: H) => I,
): I
export function pipe<A, B, C, D, E, F, G, H, I, J>(
	x: A,
	fn: (x: A) => B,
	fn2: (x: B) => C,
	fn3: (x: C) => D,
	fn4: (x: D) => E,
	fn5: (x: E) => F,
	fn6: (x: F) => G,
	fn7: (x: G) => H,
	fn8: (x: H) => I,
	fn9: (x: I) => J,
): J
export function pipe<A, B, C, D, E, F, G, H, I, J, K>(
	x: A,
	fn: (x: A) => B,
	fn2: (x: B) => C,
	fn3: (x: C) => D,
	fn4: (x: D) => E,
	fn5: (x: E) => F,
	fn6: (x: F) => G,
	fn7: (x: G) => H,
	fn8: (x: H) => I,
	fn9: (x: I) => J,
	fn10: (x: J) => K,
): K
export function pipe(x: unknown, ...fns: ((x: unknown) => unknown)[]): unknown {
	switch (fns.length) {
		case 1: {
			return fns[0]!(x)
		}
		case 2: {
			return fns[1]!(fns[0]!(x))
		}
		case 3: {
			return fns[2]!(fns[1]!(fns[0]!(x)))
		}
		case 4: {
			return fns[3]!(fns[2]!(fns[1]!(fns[0]!(x))))
		}
		case 5: {
			return fns[4]!(fns[3]!(fns[2]!(fns[1]!(fns[0]!(x)))))
		}
		case 6: {
			return fns[5]!(fns[4]!(fns[3]!(fns[2]!(fns[1]!(fns[0]!(x))))))
		}
		case 7: {
			return fns[6]!(fns[5]!(fns[4]!(fns[3]!(fns[2]!(fns[1]!(fns[0]!(x)))))))
		}
		case 8: {
			return fns[7]!(
				fns[6]!(fns[5]!(fns[4]!(fns[3]!(fns[2]!(fns[1]!(fns[0]!(x))))))),
			)
		}
		case 9: {
			return fns[8]!(
				fns[7]!(
					fns[6]!(fns[5]!(fns[4]!(fns[3]!(fns[2]!(fns[1]!(fns[0]!(x))))))),
				),
			)
		}
		case 10: {
			return fns[9]!(
				fns[8]!(
					fns[7]!(
						fns[6]!(fns[5]!(fns[4]!(fns[3]!(fns[2]!(fns[1]!(fns[0]!(x))))))),
					),
				),
			)
		}
		default: {
			let res = x
			for (const fn of fns) {
				res = fn(res)
			}
			return res
		}
	}
}

/**
 * Predicate complement
 *
 * complement :: (a -> true) -> (a -> false)
 * complement :: (a -> false) -> (a -> true)
 */
export const complement =
	<A>(f: (x: A) => boolean) =>
	(x: A) =>
		!f(x)
