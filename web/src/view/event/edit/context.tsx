import { createContext } from "solid-js"
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
	return (
		<EventEditFormContext.Provider value={props.value}>
			{props.children}
		</EventEditFormContext.Provider>
	)
}

export const useEventForm = () => assertContext(EventEditFormContext)
