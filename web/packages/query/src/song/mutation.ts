import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewSong } from "@thc/api"
import { SongApi } from "@thc/api"
import { Either } from "effect"

import type { EntityCorrectionMutationParams } from "../correction/mutation"
import { toMutationError } from "../shared/error"

type Params = EntityCorrectionMutationParams<NewCorrectionNewSong>

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			const result =
				params.type === "Create"
					? await SongApi.create({
							body: params.data,
						})
					: params.correctionId === undefined
						? await SongApi.update({
								path: { id: params.id },
								body: params.data,
							})
						: await SongApi.updatePendingCorrection({
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
		mutationKey: ["song::mutate"],
		throwOnError: true,
	}))
