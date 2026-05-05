import { useMutation } from "@tanstack/solid-query"
import type { NewCorrectionNewEvent } from "@thc/api"
import { EventApi } from "@thc/api"
import { Either } from "effect"

import type { EntityCorrectionMutationParams } from "../correction/mutation"
import { toMutationError } from "../shared/error"

type Params = EntityCorrectionMutationParams<NewCorrectionNewEvent>

export const getInstance = () =>
	useMutation(() => ({
		mutationFn: async (params: Params) => {
			if (params.type === "Create") {
				const result = await EventApi.create({
					body: params.data,
				})
				return Either.match(result, {
					onRight: (data) => data,
					onLeft: (error) => {
						throw toMutationError(error)
					},
				})
			}

			const result =
				params.correctionId === undefined
					? await EventApi.upsertCorrection({
							path: { id: params.id },
							body: params.data,
						})
					: await EventApi.updatePendingCorrection({
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
		mutationKey: ["event::mutate"],
		throwOnError: true,
	}))
