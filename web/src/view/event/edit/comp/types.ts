import type { FormStore } from "@formisch/solid"

import type { NewEventCorrection } from "~/domain/event"

type EventFormSchema = typeof NewEventCorrection

export type EventFormStore = FormStore<EventFormSchema>
