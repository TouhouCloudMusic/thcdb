import { Either as E } from "effect"

import { FetchClient } from "../../http"

export async function healthCheck(): Promise<E.Either<void, Response>> {
	const res = await FetchClient.GET("/health_check", {})

	if (res.response.ok) {
		return E.right(void 0)
	}

	return E.left(res.response)
}
