import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewRelease } from "@thc/api"
import { ReleaseApi } from "@thc/api"
import { Either } from "effect"

import { toMutationError } from "../shared/error"

type Params =
	| { type: "Create"; data: NewCorrectionNewRelease }
	| { type: "Update"; id: number; data: NewCorrectionNewRelease }

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			const result =
				params.type === "Create"
					? await ReleaseApi.create({
							body: params.data,
						})
					: await ReleaseApi.update({
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
		mutationKey: ["release::mutate"],
		throwOnError: true,
	}))

type UploadCoverArtParams = {
	id: number
	file: File
}

export const getUploadCoverArtInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: UploadCoverArtParams) => {
			const result = await ReleaseApi.uploadCoverArt({
				releaseId: params.id,
				file: params.file,
			})
			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw toMutationError(error, "Upload failed.")
				},
			})
		},
		mutationKey: ["release::cover-art::upload"],
		throwOnError: true,
	}))
