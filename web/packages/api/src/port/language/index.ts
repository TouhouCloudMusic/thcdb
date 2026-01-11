import { FetchClient } from "../../http"
import { adaptApiResult } from "../../shared"

export async function findAll() {
	const res = await FetchClient.GET("/languages", {})

	return adaptApiResult(res)
}
