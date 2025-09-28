import type { Event } from "@thc/api"
import { createContext } from "solid-js"

export type EventInfoPageContextValue = {
	event: Event
}

export const EventInfoPageContext = createContext<EventInfoPageContextValue>()
