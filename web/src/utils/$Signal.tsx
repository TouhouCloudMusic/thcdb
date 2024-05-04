/* eslint-disable @typescript-eslint/ban-types */
import { Accessor, Setter, SignalOptions, createSignal } from "solid-js";

export type $Signal<T> = (
	...args: [] | [Exclude<T, Function> | ((prev: T) => T)]
) => T;

export function $Signal<T>(): $Signal<T | undefined>;
export function $Signal<T>(
	initValue: T,
	options?: SignalOptions<T>
): $Signal<T>;
export function $Signal<T>(
	initValue?: T,
	options: SignalOptions<T | undefined> = { equals: Object.is }
): $Signal<T | undefined> {
	const [get, set] = createSignal(initValue, options);
	function signal(
		...args:
			| []
			| [Exclude<T, Function> | ((prev: T | undefined) => T | undefined)]
	): T | undefined {
		if (args.length === 0) {
			return get();
		}
		set(args[0]);
	}
	return signal as $Signal<T | undefined>;
}
