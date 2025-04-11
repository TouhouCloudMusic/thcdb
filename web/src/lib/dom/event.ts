import { type JSX } from "solid-js"

export function callHandlerUnion<T, E extends Event>(
	event: E & {
		currentTarget: T
		target: Element
	},
	handler?: JSX.EventHandlerUnion<T, E>,
) {
	if (!handler) {
		return
	}
	if (typeof handler === "function") {
		handler(event)
	} else {
		handler[0](handler[1], event)
	}
}

export function compositeHandler<T, E extends Event>(
	...handlers: JSX.EventHandlerUnion<T, E>[]
): (
	e: E & {
		currentTarget: T
		target: Element
	},
) => void {
	if (handlers.length === 2) {
		return (e) => {
			callHandlerUnion(e, handlers[0])
			callHandlerUnion(e, handlers[1])
		}
	} else {
		return (e) => {
			for (const handler of handlers) {
				callHandlerUnion(e, handler)
			}
		}
	}
}
