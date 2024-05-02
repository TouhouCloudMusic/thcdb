import { Accessor, Setter, SignalOptions, createSignal } from "solid-js";

export interface $Signal<T> {
	(): T;
	(value: T): void;
}
export function $Signal<T>(): $Signal<T | undefined>;
export function $Signal<T>(
	initValue: T,
	options?: SignalOptions<T>
): $Signal<T>;
export function $Signal<T>(
	initValue?: T,
	options?: SignalOptions<T | undefined>
): $Signal<T | undefined> {
	const [get, set] = createSignal(initValue, options);
	function signal(): T;
	function signal(upValue: T): void;
	function signal(upValue?: T): T | void {
		if (upValue === undefined) {
			return get();
		}
		set(upValue);
	}
	return signal as $Signal<T | undefined>;
}
