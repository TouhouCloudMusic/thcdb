import type { components, operations } from "../../gen"
import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult, adaptApiResultOptional } from "../../shared"

export async function findLabelById(options: Opt<"find_label_by_id">) {
	const res = await FetchClient.GET("/label/{id}", {
		params: { path: options.path },
	})

	return adaptApiResultOptional(res)
}

export async function findLabelByKeyword(
	options: Opt<"find_label_by_keyword">,
) {
	const res = await FetchClient.GET("/label", {
		params: { query: options.query },
	})

	return adaptApiResult(res)
}
