import { createSignal } from "solid-js";

export const $Signal = function <T>(x: T) {
	const [get, set] = createSignal(x);
	return {
		value: () => get(),
		set: (x: T) => set(x),
	};
};
