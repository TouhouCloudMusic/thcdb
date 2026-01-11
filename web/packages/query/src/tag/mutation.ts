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
			const result =
				params.type === "Create"
					? await TagApi.create({
							body: params.data,
						})
					: await TagApi.upsertCorrection({
							path: { id: params.id },
							body: params.data,
						})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
		},
		mutationKey: ["tag::mutate"],
		throwOnError: true,
	}))
