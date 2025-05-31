import { FetchClient } from ".."
import type { ReleaseType } from "../release"
import type { Pagination } from "../shared"
import { handleApiResponse } from "../utils"
import type { NewArtistCorrectionOut } from "./schema"

export interface __CreataOption {
	data: NewArtistCorrectionOut
}
export async function __create(opt: __CreataOption) {
	const { data, error, response } = await FetchClient.POST("/artist", {
		body: opt.data,
	})
	if (data) {
		return data
	}

	if (error) {
		throw new Error(error.message)
	}

	throw new Error(response.statusText)
}

export async function __findById(id: number) {
	const res = await FetchClient.GET(`/artist/{id}`, {
		params: {
			path: {
				id,
			},
		},
	})

	return handleApiResponse(res)
}

const DEFAULT_ARTIST_RELEASE_LIMIT = 10

export async function __appearances(
	id: number,
	pagination?: Partial<Pagination>,
) {
	const res = await FetchClient.GET(`/artist/{id}/appearances`, {
		params: {
			path: {
				id,
			},
			query: {
				cursor: pagination?.cursor ?? 0,
				limit: pagination?.limit ?? DEFAULT_ARTIST_RELEASE_LIMIT,
			},
		},
	})

	return handleApiResponse(res)
}

export async function __credits(id: number, pagination?: Partial<Pagination>) {
	const res = await FetchClient.GET(`/artist/{id}/credits`, {
		params: {
			path: {
				id,
			},
			query: {
				cursor: pagination?.cursor ?? 0,
				limit: pagination?.limit ?? DEFAULT_ARTIST_RELEASE_LIMIT,
			},
		},
	})

	return handleApiResponse(res)
}

export async function __discographies(
	id: number,
	releaseType: ReleaseType,
	pagination?: Partial<Pagination>,
) {
	const res = await FetchClient.GET(`/artist/{id}/discographies`, {
		params: {
			path: {
				id,
			},
			query: {
				release_type: releaseType,
				cursor: pagination?.cursor ?? 0,
				limit: pagination?.limit ?? DEFAULT_ARTIST_RELEASE_LIMIT,
			},
		},
	})

	return handleApiResponse(res)
}

export async function __discographiesInit(
	id: number,
	limit = DEFAULT_ARTIST_RELEASE_LIMIT,
) {
	const res = await FetchClient.GET(`/artist/{id}/discographies/init`, {
		params: {
			path: {
				id,
			},
			query: {
				limit,
			},
		},
	})

	return handleApiResponse(res)
}
