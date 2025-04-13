import { type Context, useContext } from "solid-js"

/** @deprecated use `assertContext` instead */
export function useContextUnsave<T>(context: Context<T>): NonNullable<T> {
	return useContext(context) as NonNullable<T>
}

export function assertContext<T>(context: Context<T>): NonNullable<T> {
	const ctx = useContext(context)

	if (import.meta.env.DEV && !ctx) {
		throw new Error("Context is not set, please make sure you're in a provider")
	}

	return ctx as NonNullable<T>
}
