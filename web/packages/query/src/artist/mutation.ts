import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewArtist } from "@thc/api"
import { ArtistApi } from "@thc/api"
import { Either } from "effect"

import type { EntityCorrectionMutationParams } from "../correction/mutation"
import { toMutationError } from "../shared/error"

type Params = EntityCorrectionMutationParams<NewCorrectionNewArtist>

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			const result =
				params.type === "Create"
					? await ArtistApi.create({
							body: params.data,
						})
					: params.correctionId === undefined
						? await ArtistApi.upsertCorrection({
								path: { id: params.id },
								body: params.data,
							})
						: await ArtistApi.updatePendingCorrection({
								path: {
									id: params.id,
									correction_id: params.correctionId,
								},
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
