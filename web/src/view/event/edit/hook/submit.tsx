import { useQueryClient } from "@tanstack/solid-query"
import type { Event, NewCorrectionNewEvent } from "@thc/api"
import { EventMutation, EventQueryOption } from "@thc/query"

import { createEntityFormSubmit } from "~/view/correction/pendingCorrection"

import type { EventWithLocation } from "./init"

type Props =
	| { type: "new" }
	| {
			type: "edit"
			event: EventWithLocation
			pendingCorrectionId?: number
	  }

export function createEventFormSubmission(input: Props) {
	const queryClient = useQueryClient()
	const mutation = EventMutation.getInstance()

	return createEntityFormSubmit<Event, NewCorrectionNewEvent>({
		entityType: "event",
		mutation,
		props:
			input.type === "new"
				? input
				: {
						type: "edit",
						entity: input.event,
						pendingCorrectionId: input.pendingCorrectionId,
					},
		onCreateSuccess() {
			void queryClient.invalidateQueries({
				queryKey: [EventQueryOption.QUERY_KEYS.DETAIL_KEYWORD],
			})
		},
		onUpdateSuccess(result) {
			void queryClient.invalidateQueries({
				queryKey: [EventQueryOption.QUERY_KEYS.DETAIL_ID, result.entity_id],
			})
		},
	})
}
