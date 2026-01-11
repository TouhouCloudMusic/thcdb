import { createContext, untrack } from "solid-js"
import type { ParentProps } from "solid-js"

import { assertContext } from "~/utils/solid/assertContext"

import type { EventFormStore } from "./comp/types"
import type { EventWithLocation } from "./hook/init"

type EventEditFormContextValue = {
	formStore: EventFormStore
	event?: EventWithLocation
}

const EventEditFormContext = createContext<EventEditFormContextValue>()

export function EventFormProvider(
	props: ParentProps<{ value: EventEditFormContextValue }>,
) {
	const value = untrack(() => props.value)
	return (
		<EventEditFormContext.Provider value={value}>
			{props.children}
		</EventEditFormContext.Provider>
	)
}

export const useEventForm = () => assertContext(EventEditFormContext)
