import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewRelease } from "@thc/api"
import { ReleaseApi } from "@thc/api"
import { Either } from "effect"

type Params =
	| { type: "Create"; data: NewCorrectionNewRelease }
	| { type: "Update"; id: number; data: NewCorrectionNewRelease }

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			if (params.type === "Create") {
				const result = await ReleaseApi.create({
					body: params.data,
				})
				return Either.match(result, {
					onRight: (data) => data,
					onLeft: (error) => {
						throw error
					},
				})
			} else {
				const result = await ReleaseApi.update({
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
		mutationKey: ["release::mutate"],
		throwOnError: true,
	}))
