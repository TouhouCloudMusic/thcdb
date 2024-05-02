import { Setter } from "solid-js";
import { $Signal } from "./$Signal";

export function createClickOutsize<T>(
	ref: Array<() => HTMLElement | undefined>,
	signal: Setter<boolean>
) {
	return (event: Event) => {
		const target = event.target as HTMLElement;

		for (const el of ref) {
			if (el()?.contains(target)) return;
		}
		signal(false);
	};
}
