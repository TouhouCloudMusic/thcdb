import { useMutation } from "@tanstack/solid-query"
import type { ImageQueueAction } from "@thc/api"
import { ImageQueueApi } from "@thc/api"
import { Either } from "effect"

import { toMutationError } from "../shared/error"

type Params = {
	id: number
	action: ImageQueueAction
}

export const useModerateImageQueueMutation = () =>
	useMutation(() => ({
		mutationKey: ["image-queue::moderate"],
		mutationFn: async (params: Params) => {
			const result = await ImageQueueApi.moderate({
				path: { id: params.id },
				query: { action: params.action },
			})

			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw toMutationError(error)
				},
			})
		},
		throwOnError: true,
	}))
