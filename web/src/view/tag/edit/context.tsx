import type { Tag } from "@thc/api"
import { createContext, untrack } from "solid-js"
import type { ParentProps } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

import type { TagFormStore } from "./comp/types"

export type TagEditFormContextValue = {
	formStore: TagFormStore
	tag?: Tag
}

const TagEditFormContext = createContext<TagEditFormContextValue>()

export function TagFormProvider(
	props: ParentProps<{ value: TagEditFormContextValue }>,
) {
	const value = untrack(() => props.value)
	return (
		<TagEditFormContext.Provider value={value}>
			{props.children}
		</TagEditFormContext.Provider>
	)
}

export const useTagForm = () => assertContext(TagEditFormContext)
