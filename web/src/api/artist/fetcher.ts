import { FetchClient } from ".."
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
