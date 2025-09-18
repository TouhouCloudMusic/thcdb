import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewSong } from "@thc/api"
import { SongApi } from "@thc/api"
import { Either } from "effect"

type Params =
	| { type: "Create"; data: NewCorrectionNewSong }
	| { type: "Update"; id: number; data: NewCorrectionNewSong }

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			if (params.type === "Create") {
				const result = await SongApi.create({
					body: params.data,
				})
				return Either.match(result, {
					onRight: (data) => data,
					onLeft: (error) => {
						throw error
					},
				})
			} else {
				const result = await SongApi.update({
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
		mutationKey: ["song::mutate"],
		throwOnError: true,
	}))
