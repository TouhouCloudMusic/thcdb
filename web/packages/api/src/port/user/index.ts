import { FetchClient } from "../../http"
import type { Path } from "../../shared"
import { adaptApiResultOptional } from "../../shared"

export async function profile() {
	const res = await FetchClient.GET("/profile", {})

	return adaptApiResultOptional(res)
}

export async function profileWithName(options: {
	path: Path<"profile_with_name">
}) {
	const res = await FetchClient.GET("/profile/{name}", {
		params: { path: options.path },
	})

	return adaptApiResultOptional(res)
}
