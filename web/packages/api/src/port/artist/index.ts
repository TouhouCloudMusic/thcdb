import type { components, operations } from "../../gen"
import { FetchClient } from "../../http"
import type { ApiResult, Opt, Query } from "../../shared"
import { adaptApiResult, adaptApiResultOptional } from "../../shared"

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
		params: options,
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function findAppearances(options: Opt<"find_artist_apperances">) {
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
