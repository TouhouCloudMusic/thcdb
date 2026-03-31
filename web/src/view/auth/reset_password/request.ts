import { Effect } from "effect"

import {
	forgotPassword,
	resetPassword,
	verifyResetCode,
} from "~/hey-api/sdk.gen"
import type { Options as SdkOptions } from "~/hey-api/sdk.gen"
import type {
	ForgotPasswordData,
	ResetPasswordData,
	VerifyResetCodeData,
} from "~/hey-api/types.gen"

import type { AuthApiResponse } from "./response"
import { REQUEST_FAILED_ERROR } from "./response"

type JsonRequestResult = {
	data?: unknown
	error?: unknown
	response?: Response
}

function postJson(request: Promise<JsonRequestResult>) {
	return Effect.tryPromise({
		try: async (): Promise<AuthApiResponse> => {
			const result = await request

			if (!(result.response instanceof globalThis.Response)) {
				throw REQUEST_FAILED_ERROR
			}
			return {
				status: result.response.status,
				data: result.response.ok ? result.data : result.error,
			}
		},
		catch: () => REQUEST_FAILED_ERROR,
	})
}

export function requestForgotPassword(
	request: ForgotPasswordData["body"],
	options?: SdkOptions<ForgotPasswordData>,
) {
	return postJson(forgotPassword({ ...options, body: request }))
}

export function requestResetPassword(
	request: ResetPasswordData["body"],
	options?: SdkOptions<ResetPasswordData>,
) {
	return postJson(resetPassword({ ...options, body: request }))
}

export function requestVerifyResetCode(
	request: VerifyResetCodeData["body"],
	options?: SdkOptions<VerifyResetCodeData>,
) {
	return postJson(verifyResetCode({ ...options, body: request }))
}
