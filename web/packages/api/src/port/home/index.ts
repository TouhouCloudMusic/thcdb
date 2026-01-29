import type { HomeMetadata } from "../../gen"
import { adaptApiResult, adaptFetchResponseFromResponse } from "../../shared"

export async function metadata() {
	const response = await fetch("/api/home/metadata", {
		method: "GET",
		headers: {
			Accept: "application/json",
		},
	})

	const res = await adaptFetchResponseFromResponse<HomeMetadata>(response)

	return adaptApiResult(res)
}
