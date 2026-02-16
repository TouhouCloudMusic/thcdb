import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
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

export async function verifyEmail(options: Opt<"verify_email">) {
	const res = await FetchClient.POST("/verify-email", {
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function resendVerificationEmail(
	options: Opt<"resend_verification_email">,
) {
	const res = await FetchClient.POST("/resend-verification-email", {
		body: options.body,
	})

	return adaptApiResult(res)
}

export async function signout() {
	const res = await FetchClient.GET("/sign-out", {})

	return adaptApiResultMessage(res)
}
