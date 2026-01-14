import { useMutation } from "@tanstack/solid-query"
import type { HandleImageQueueMethod } from "@thc/api"
import { ImageQueueApi } from "@thc/api"
import { Either } from "effect"

type Params = {
	id: number
	method: HandleImageQueueMethod
}

export const getHandleInstance = () =>
	useMutation(() => ({
		mutationKey: ["image-queue::handle"],
		mutationFn: async (params: Params) => {
			const result = await ImageQueueApi.handle({
				path: { id: params.id },
				query: { method: params.method },
			})

			return Either.match(result, {
				onRight: (data) => data,
				onLeft: (error) => {
					throw error
				},
			})
		},
		throwOnError: true,
	}))
