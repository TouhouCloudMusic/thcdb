import { FetchClient } from ".."
import { handleApiResponse } from "../utils"

export async function getLanguages() {
	const res = await FetchClient.GET("/languages")

	return handleApiResponse(res)
}
