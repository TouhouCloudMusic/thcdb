import { adaptApiResult, adaptFetchResponseFromResponse } from "../../shared"
import type { HomeMetadata } from "../../type"

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
