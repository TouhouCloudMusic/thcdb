import type { Context } from "solid-js"
import { useContext } from "solid-js"

export function assertContext<T>(
	context: Context<T>,
	name?: string,
): NonNullable<T> {
	const ctx = useContext(context)

	if (import.meta.env.DEV && !ctx) {
		throw new Error(
			`${name ?? "Context"} is not set, please make sure you're in a provider`,
		)
	}

	return ctx as NonNullable<T>
}
