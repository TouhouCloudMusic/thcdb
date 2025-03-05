import { type Context, useContext } from "solid-js"

export function useContextUnsave<T>(context: Context<T>): NonNullable<T> {
  return useContext(context) as NonNullable<T>
}
