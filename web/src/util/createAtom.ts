/* eslint-disable @typescript-eslint/ban-types */

import { Setter, SignalOptions, createSignal } from "solid-js"

export type Atom<T> = (...args: [] | Parameters<Setter<T>>) => T

export function createAtom<T>(): Atom<T | undefined>
export function createAtom<T>(initValue: T, options?: SignalOptions<T>): Atom<T>
export function createAtom<T>(
	initValue?: T,
	options: SignalOptions<T | undefined> = { equals: Object.is }
) {
	const [getter, setter] = createSignal(initValue, options)

	function atom(
		...args: [] | Parameters<Setter<T | undefined>>
	): T | undefined {
		if (args.length === 0) {
			return getter()
		}
		setter(args[0])
	}

	return atom
}

export { createAtom as createRef }
