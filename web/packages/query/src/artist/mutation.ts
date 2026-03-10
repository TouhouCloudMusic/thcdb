import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewArtist } from "@thc/api"
import { ArtistApi } from "@thc/api"
import { Either } from "effect"

import { toMutationError } from "../shared/error"

type Params =
	| { type: "Create"; data: NewCorrectionNewArtist }
	| { type: "Update"; id: number; data: NewCorrectionNewArtist }

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			const result =
				params.type === "Create"
					? await ArtistApi.create({
							body: params.data,
						})
					: await ArtistApi.upsertCorrection({
							path: { id: params.id },
							body: params.data,
						})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw toMutationError(error)
				},
			})
		},
		mutationKey: [`artist::mutate`],
		throwOnError: true,
	}))

type UploadProfileImageParams = {
	id: number
	file: File
}

export const getUploadProfileImageInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: UploadProfileImageParams) => {
			const result = await ArtistApi.uploadProfileImage({
				artistId: params.id,
				file: params.file,
			})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw toMutationError(error, "Upload failed.")
				},
			})
		},
		mutationKey: ["artist::profile-image::upload"],
		throwOnError: true,
	}))
