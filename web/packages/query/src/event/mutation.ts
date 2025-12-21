import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewEvent } from "@thc/api"
import { EventApi } from "@thc/api"
import { Either } from "effect"

type Params =
	| {
			type: "Create"
			data: NewCorrectionNewEvent
	  }
	| {
			type: "Update"
			id: number
			data: NewCorrectionNewEvent
	  }

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			if (params.type === "Create") {
				const result = await EventApi.create({
					body: params.data,
				})
				return Either.match(result, {
					onRight: (data) => data,
					onLeft: (error) => {
						throw error
					},
				})
			}

			const result = await EventApi.upsertCorrection({
				path: { id: params.id },
				body: params.data.data,
			})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
		},
		mutationKey: ["event::mutate"],
		throwOnError: true,
	}))
