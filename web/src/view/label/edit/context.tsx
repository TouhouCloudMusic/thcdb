import type { Label } from "@thc/api"
import { createContext, untrack } from "solid-js"
import type { ParentProps } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

import type { LabelFormStore } from "./comp/types"

type LabelEditFormContextValue = {
	formStore: LabelFormStore
	label?: Label
}

const LabelEditFormContext = createContext<LabelEditFormContextValue>()

export function LabelFormProvider(
	props: ParentProps<{ value: LabelEditFormContextValue }>,
) {
	const value = untrack(() => props.value)
	return (
		<LabelEditFormContext.Provider value={value}>
			{props.children}
		</LabelEditFormContext.Provider>
	)
}

export const useLabelForm = () => assertContext(LabelEditFormContext)
