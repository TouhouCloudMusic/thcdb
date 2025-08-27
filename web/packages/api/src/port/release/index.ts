import type { components, operations } from "../../gen"
import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult, adaptApiResultOptional } from "../../shared"

export async function findReleaseById(options: Opt<"find_release_by_id">) {
	const res = await FetchClient.GET("/release/{id}", {
		params: { path: options.path },
	})

	return adaptApiResultOptional(res)
}

export async function findReleaseByKeyword(
	options: Opt<"find_release_by_keyword">,
) {
	const res = await FetchClient.GET("/release", {
		params: { query: options.query },
	})

	return adaptApiResult(res)
}
