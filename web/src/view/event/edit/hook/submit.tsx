import { useQueryClient } from "@tanstack/solid-query"
import { useNavigate } from "@tanstack/solid-router"
import { EventMutation, EventQueryOption } from "@thc/query"
import type { InferOutput } from "valibot"

import type { NewEventCorrection } from "~/domain/event"

import type { EventFormInitProps as Props } from "./init"

export function createEventFormSubmission(props: Props) {
	const navigator = useNavigate()
	const queryClient = useQueryClient()
	const mutation = EventMutation.getInstance()

	const handleSubmit = (output: InferOutput<typeof NewEventCorrection>) => {
		const normalizeLocation = () => {
			const location = output.data.location
			if (!location) return

			const { country, province, city } = location
			if (!country && !province && !city) return

			return location
		}

		const normalizedData = {
			...output.data,
			location: normalizeLocation(),
		}

		if (props.type === "new") {
			mutation.mutate(
				{ type: "Create", data: { ...output, data: normalizedData } },
				{
					onSuccess() {
						void queryClient.invalidateQueries({
							queryKey: [EventQueryOption.QUERY_KEYS.DETAIL_KEYWORD],
						})
						void navigator({ to: "/" })
					},
					onError(error) {
						if (import.meta.env.DEV) {
							console.error("Failed to create event:", error)
						}
					},
				},
			)
			return
		}

		mutation.mutate(
			{ type: "Update", id: props.event.id, data: normalizedData },
			{
				onSuccess() {
					void queryClient.invalidateQueries({
						queryKey: [EventQueryOption.QUERY_KEYS.DETAIL_ID, props.event.id],
					})
					void navigator({ to: `/event/${props.event.id}` })
				},
				onError(error) {
					if (import.meta.env.DEV) {
						console.error("Failed to update event:", error)
					}
				},
			},
		)
	}

	return {
		handleSubmit,
		mutation,
	}
}
