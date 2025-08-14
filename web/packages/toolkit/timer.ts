import type { VoidFn } from "./types"

export type DebouncedFn<Args extends unknown[] = never[]> = {
	(...args: Args): void
	cancel(): void
}
export function debounce(
	timeout: number,
): <T extends unknown[]>(fn: VoidFn<T>) => DebouncedFn<T>
export function debounce<T extends unknown[]>(
	fn: VoidFn<T>,
): (timeout: number) => DebouncedFn<T>
export function debounce<T extends unknown[]>(
	fn: VoidFn<T>,
	timeout: number,
): DebouncedFn<T>
export function debounce<T extends unknown[]>(
	timeout: number,
	fn: VoidFn<T>,
): DebouncedFn<T>
export function debounce<T extends unknown[]>(
	arg1: number | VoidFn<T>,
	arg2?: number | VoidFn<T>,
	// oxlint-disable-next-line no-explicit-any
): any {
	// oxlint-disable-next-line no-undef
	const argsLength = arguments.length

	if (argsLength === 2) {
		if (typeof arg1 === "number") {
			return createDebounced(arg2 as VoidFn<T>, arg1)
		} else if (typeof arg1 === "function") {
			return createDebounced(arg1, arg2 as number)
		}
	} else if (argsLength === 1) {
		if (typeof arg1 === "number") {
			return (fn: VoidFn) => createDebounced(fn, arg1)
		} else if (typeof arg1 === "function") {
			return (timeout: number) => createDebounced(arg1, timeout)
		}
	}
}

function createDebounced<T extends unknown[]>(
	fn: VoidFn<T>,
	timeout: number,
): DebouncedFn<T> {
	let timer: ReturnType<typeof setTimeout> | undefined = undefined
	return Object.assign(
		(...args: T) => {
			if (timer) {
				clearTimeout(timer)
			}
			timer = setTimeout(() => {
				fn(...args)
			}, timeout)
		},
		{
			cancel() {
				if (timer) {
					clearTimeout(timer)
					timer = undefined
				}
			},
		},
	)
}
