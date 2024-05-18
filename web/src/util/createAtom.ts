/* eslint-disable @typescript-eslint/ban-types */

import { SignalOptions, createSignal } from "solid-js"

export type Atom<T> = (
	...args: [] | [Exclude<T, Function> | ((prev: T) => T)]
) => T

export function createAtom<T>(): Atom<T | undefined>
export function createAtom<T>(initValue: T, options?: SignalOptions<T>): Atom<T>
export function createAtom<T>(
	initValue?: T,
	options: SignalOptions<T | undefined> = { equals: Object.is }
) {
	const [getter, setter] = createSignal(initValue, options)

	function atom(
		...args:
			| []
			| [Exclude<T, Function> | ((prev: T | undefined) => T | undefined)]
	): T | undefined {
		if (args.length === 0) {
			return getter()
		}
		setter(args[0])
	}

	return atom
}
