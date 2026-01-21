import { queryOptions } from "@tanstack/solid-query"
import type { HomeMetadata } from "@thc/api"
import { HomeApi } from "@thc/api"
import { Either, identity } from "effect"

export function metadata() {
	return queryOptions({
		queryKey: ["home::metadata"],
		queryFn: async () => {
			const result = await HomeApi.metadata()
			return Either.match(result, {
				onRight: identity,
				onLeft: (error) => {
					throw error
				},
			})
		},
		throwOnError: true,
	})
}

export type HomeMetadataResponse = HomeMetadata
