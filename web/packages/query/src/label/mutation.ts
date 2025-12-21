import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewLabel } from "@thc/api"
import { LabelApi } from "@thc/api"
import { Either } from "effect"

type Params =
	| { type: "Create"; data: NewCorrectionNewLabel }
	| { type: "Update"; id: number; data: NewCorrectionNewLabel }

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			if (params.type === "Create") {
				const result = await LabelApi.create({
					body: params.data,
				})
				return Either.match(result, {
					onRight: (message) => message,
					onLeft: (error) => {
						throw error
					},
				})
			}

			const result = await LabelApi.upsertCorrection({
				path: { id: params.id },
				body: params.data,
			})
			return Either.match(result, {
				onRight: (message) => message,
				onLeft: (error) => {
					throw error
				},
			})
		},
		mutationKey: ["label::mutate"],
		throwOnError: true,
	}))
