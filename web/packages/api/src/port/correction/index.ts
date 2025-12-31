import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult } from "../../shared"

export async function findOne(options: Opt<"get_correction">) {
	const res = await FetchClient.GET("/correction/{id}", {
		params: { path: options.path, query: options.query },
	})

	return adaptApiResult(res)
}

export async function findRevisions(options: Opt<"get_correction_revisions">) {
	const res = await FetchClient.GET("/correction/{id}/revisions", {
		params: { path: options.path, query: options.query },
	})

	return adaptApiResult(res)
}

export async function findDiff(options: Opt<"get_correction_diff">) {
	const res = await FetchClient.GET("/correction/{id}/diff", {
		params: { path: options.path, query: options.query },
	})

	return adaptApiResult(res)
}

export async function compare(options: Opt<"compare_corrections">) {
	const res = await FetchClient.GET("/correction/{id1}/compare/{id2}", {
		params: { path: options.path, query: options.query },
	})

	return adaptApiResult(res)
}

export async function findHistory(options: Opt<"entity_corrections">) {
	const res = await FetchClient.GET("/{entity_type}/{id}/corrections", {
		params: { path: options.path, query: options.query },
	})

	return adaptApiResult(res)
}
