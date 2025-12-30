import type { components, operations } from "../../gen"
import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import {
	adaptApiResult,
	adaptApiResultOptional,
} from "../../shared"

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

export async function create(options: Opt<"create_release">) {
	const res = await FetchClient.POST("/release", {
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function update(options: Opt<"update_release">) {
	const res = await FetchClient.POST("/release/{id}", {
		params: { path: options.path },
		body: options.body,
	})

	return adaptApiResult(res)
}
