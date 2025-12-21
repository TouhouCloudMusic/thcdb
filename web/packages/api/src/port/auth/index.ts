import type { components, operations } from "../../gen"
import { FetchClient } from "../../http"
import type { ApiResult, Opt } from "../../shared"
import { adaptApiResult, adaptApiResultMessage } from "../../shared"

export async function signin(options: Opt<"sign_in">) {
	const res = await FetchClient.POST("/sign-in", {
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function signup(options: Opt<"sign_up">) {
	const res = await FetchClient.POST("/sign-up", {
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function signout() {
	const res = await FetchClient.GET("/sign-out", {})

	return adaptApiResultMessage(res)
}
