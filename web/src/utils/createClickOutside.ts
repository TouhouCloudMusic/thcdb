import { Setter } from "solid-js";

export function createClickOutsize<T extends () => HTMLElement | undefined>(
	ref: Array<T>,
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
