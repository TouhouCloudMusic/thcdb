import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import {
	adaptApiResult,
	adaptApiResultOptional,
	adaptFetchResponseFromResponse,
} from "../../shared"

export async function explore(options?: Opt<"explore_artist">) {
	const res = await FetchClient.GET("/artist/explore", {
		params: { query: options?.query },
	})

	return adaptApiResult(res)
}

export async function findOne(options: Opt<"find_artist_by_id">) {
	const res = await FetchClient.GET("/artist/{id}", {
		params: { path: options.path, query: options.query },
	})

	return adaptApiResultOptional(res)
}

export async function findMany(options: Opt<"find_many_artist">) {
	const res = await FetchClient.GET("/artist", {
		params: options,
	})

	return adaptApiResult(res)
}

export async function create(options: Opt<"create_artist">) {
	const res = await FetchClient.POST("/artist", {
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function upsertCorrection(
	options: Opt<"upsert_artist_correction">,
) {
	const res = await FetchClient.POST("/artist/{id}", {
		params: { path: options.path },
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function updatePendingCorrection(
	options: Opt<"update_artist_pending_correction">,
) {
	const res = await FetchClient.POST(
		"/artist/{id}/correction/{correction_id}",
		{
			params: { path: options.path },
			body: options.body,
		},
	)

	return adaptApiResult(res)
}

export async function findAppearances(options: Opt<"find_artist_appearances">) {
	const res = await FetchClient.GET("/artist/{id}/appearances", {
		params: options,
	})

	return adaptApiResult(res)
}

export async function getCredits(options: Opt<"get_artist_credits">) {
	const res = await FetchClient.GET("/artist/{id}/credits", {
		params: options,
	})

	return adaptApiResult(res)
}

export async function findDiscographiesByType(
	options: Opt<"find_artist_discographies_by_type">,
) {
	const res = await FetchClient.GET("/artist/{id}/discographies", {
		params: options,
	})

	return adaptApiResult(res)
}

export async function findDiscographiesInit(
	options: Opt<"find_artist_discographies_init">,
) {
	const res = await FetchClient.GET("/artist/{id}/discographies/init", {
		params: options,
	})

	return adaptApiResult(res)
}

export async function uploadProfileImage(options: {
	artistId: number
	file: File
}) {
	const body = new FormData()
	body.append("data", options.file)

	const response = await fetch(
		`/api/artist/${options.artistId}/profile-image`,
		{
			method: "POST",
			headers: {
				Accept: "application/json",
			},
			body,
		},
	)

	const res = await adaptFetchResponseFromResponse<number>(response)
	return adaptApiResult(res)
}
