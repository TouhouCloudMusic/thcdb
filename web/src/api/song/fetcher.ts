import { FetchClient } from ".."
import { handleApiResponse } from "../utils"

export async function findById(id: number) {
	let res = await FetchClient.GET("/song/{id}", {
		params: {
			path: { id: id },
		},
	})

	return handleApiResponse(res)
}

export async function findByKeyword(keyword: string) {
	let res = await FetchClient.GET("/song", {
		params: {
			query: { keyword },
		},
	})

	return handleApiResponse(res)
}
