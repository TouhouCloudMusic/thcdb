import { Context, useContext } from "solid-js"

export function useContextUnsave<T>(context: Context<T>) {
	return useContext(context) as NonNullable<T>
}
