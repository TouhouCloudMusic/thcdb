import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult, adaptApiResultMessage } from "../../shared"

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

export async function findComments(options: Opt<"find_comments">) {
	const res = await FetchClient.GET("/correction/{id}/comments", {
		params: { path: options.path, query: options.query },
	})

	return adaptApiResult(res)
}

export async function createComment(options: Opt<"create_comment">) {
	const res = await FetchClient.POST("/correction/{id}/comments", {
		params: { path: options.path },
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function deleteComment(options: Opt<"delete_comment">) {
	const res = await FetchClient.DELETE("/comment/{id}", {
		params: { path: options.path },
	})

	return adaptApiResultMessage(res)
}

export async function findHistory(options: Opt<"entity_corrections">) {
	const res = await FetchClient.GET("/{entity_type}/{id}/corrections", {
		params: { path: options.path, query: options.query },
	})

	return adaptApiResult(res)
}
