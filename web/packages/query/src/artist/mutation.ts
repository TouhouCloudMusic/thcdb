import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewArtist } from "@thc/api"
import { ArtistApi } from "@thc/api"
import { Either } from "effect"

type Parmas =
	| { type: "Create"; data: NewCorrectionNewArtist }
	| { type: "Update"; id: number; data: NewCorrectionNewArtist }
export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Parmas) => {
			if (params.type === "Create") {
				const result = await ArtistApi.create({
					body: params.data,
				})
				return Either.match(result, {
					onRight: (data) => data,
					onLeft: (error) => {
						throw error
					},
				})
			} else {
				const result = await ArtistApi.upsertCorrection({
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
		mutationKey: [`artist::mutate`],
		throwOnError: true,
	}))
