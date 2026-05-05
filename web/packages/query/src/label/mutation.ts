import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewLabel } from "@thc/api"
import { LabelApi } from "@thc/api"
import { Either } from "effect"

import type { EntityCorrectionMutationParams } from "../correction/mutation"
import { toMutationError } from "../shared/error"

type Params = EntityCorrectionMutationParams<NewCorrectionNewLabel>

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			if (params.type === "Create") {
				const result = await LabelApi.create({
					body: params.data,
				})
				return Either.match(result, {
					onRight: (message) => message,
					onLeft: (error) => {
						throw toMutationError(error)
					},
				})
			}

			const result =
				params.correctionId === undefined
					? await LabelApi.upsertCorrection({
							path: { id: params.id },
							body: params.data,
						})
					: await LabelApi.updatePendingCorrection({
							path: {
								id: params.id,
								correction_id: params.correctionId,
							},
							body: params.data,
						})
			return Either.match(result, {
				onRight: (message) => message,
				onLeft: (error) => {
					throw toMutationError(error)
				},
			})
		},
		mutationKey: ["label::mutate"],
		throwOnError: true,
	}))
