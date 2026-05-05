import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewTag } from "@thc/api"
import { TagApi } from "@thc/api"
import { Either } from "effect"

import type { EntityCorrectionMutationParams } from "../correction/mutation"
import { toMutationError } from "../shared/error"

type Params = EntityCorrectionMutationParams<NewCorrectionNewTag>

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			const result =
				params.type === "Create"
					? await TagApi.create({
							body: params.data,
						})
					: params.correctionId === undefined
						? await TagApi.upsertCorrection({
								path: { id: params.id },
								body: params.data,
							})
						: await TagApi.updatePendingCorrection({
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
		mutationKey: ["tag::mutate"],
		throwOnError: true,
	}))
