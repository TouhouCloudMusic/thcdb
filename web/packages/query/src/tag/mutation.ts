import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewTag } from "@thc/api"
import { TagApi } from "@thc/api"
import { Either } from "effect"

type Params =
	| { type: "Create"; data: NewCorrectionNewTag }
	| { type: "Update"; id: number; data: NewCorrectionNewTag }

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			if (params.type === "Create") {
				const result = await TagApi.create({
					body: params.data,
				})
				return Either.match(result, {
					onRight: (data) => data,
					onLeft: (error) => {
						throw error
					},
				})
			} else {
				const result = await TagApi.upsertCorrection({
					path: { id: params.id },
					body: params.data,
				})
				return Either.match(result, {
					onRight: (data) => data,
					onLeft: (error) => {
						throw error
					},
				})
			}
		},
		mutationKey: ["tag::mutate"],
		throwOnError: true,
	}))
