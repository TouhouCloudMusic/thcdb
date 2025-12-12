import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import {
	adaptApiResult,
	adaptApiResultMessage,
	adaptApiResultOptional,
} from "../../shared"

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

export async function create(options: Opt<"create_label">) {
	const res = await FetchClient.POST("/label", {
		body: options.body,
	})

	return adaptApiResultMessage(res)
}

export async function upsertCorrection(
	options: Opt<"upsert_label_correction">,
) {
	const res = await FetchClient.POST("/label/{id}", {
		params: { path: options.path },
		body: options.body,
	})

	return adaptApiResultMessage(res)
}
