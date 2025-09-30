import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import {
	adaptApiResult,
	adaptApiResultOptional,
	adaptApiResultMessage,
} from "../../shared"

export async function findEventById(options: Opt<"find_event_by_id">) {
	const res = await FetchClient.GET("/event/{id}", {
		params: { path: options.path },
	})

	return adaptApiResultOptional(res)
}

export async function findEventByKeyword(
	options: Opt<"find_event_by_keyword">,
) {
	const res = await FetchClient.GET("/event", {
		params: { query: options.query },
	})

	return adaptApiResult(res)
}

export async function create(options: Opt<"create_event">) {
	const res = await FetchClient.POST("/event", {
		body: options.body,
	})

	return adaptApiResultMessage(res)
}

export async function upsertCorrection(
	options: Opt<"upsert_event_correction">,
) {
	const res = await FetchClient.POST("/event/{id}", {
		params: { path: options.path },
		body: options.body,
	})

	return adaptApiResultMessage(res)
}
