import type { components, operations } from "../../gen"
import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult, adaptApiResultOptional } from "../../shared"

export async function findTagById(options: Opt<"find_tag_by_id">) {
	const res = await FetchClient.GET("/tag/{id}", {
		params: { path: options.path },
	})

	return adaptApiResultOptional(res)
}

export async function findTagByKeyword(options: Opt<"find_tag_by_keyword">) {
	const res = await FetchClient.GET("/tag", {
		params: { query: options.query },
	})

	return adaptApiResult(res)
}
