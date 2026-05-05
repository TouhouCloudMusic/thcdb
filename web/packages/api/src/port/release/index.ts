import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import {
	adaptApiResult,
	adaptApiResultOptional,
	adaptFetchResponseFromResponse,
} from "../../shared"

export async function explore(options?: Opt<"explore_release">) {
	const res = await FetchClient.GET("/release/explore", {
		params: { query: options?.query },
	})

	return adaptApiResult(res)
}

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

export async function updatePendingCorrection(
	options: Opt<"update_release_pending_correction">,
) {
	const res = await FetchClient.POST(
		"/release/{id}/correction/{correction_id}",
		{
			params: { path: options.path },
			body: options.body,
		},
	)

	return adaptApiResult(res)
}

export async function uploadCoverArt(options: {
	releaseId: number
	file: File
}) {
	const body = new FormData()
	body.append("data", options.file)

	const response = await fetch(`/api/release/${options.releaseId}/cover-art`, {
		method: "POST",
		headers: {
			Accept: "application/json",
		},
		body,
	})

	const res = await adaptFetchResponseFromResponse<number>(response)
	return adaptApiResult(res)
}
