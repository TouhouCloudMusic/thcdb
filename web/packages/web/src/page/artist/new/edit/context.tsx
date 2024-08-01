import { createContext } from "solid-js"
import { useContextUnsave } from "~/lib/context/use_context_unsave"
import { type createController } from "./data/controller"

export const Context = createContext<ReturnType<typeof createController>>()
export function useController() {
	return useContextUnsave(Context)
}
