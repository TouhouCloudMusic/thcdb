import { Effect } from "effect"

import {
	getForgotPasswordUrl,
	getResetPasswordUrl,
	getVerifyResetCodeUrl,
} from "~/orval/auth"
import type {
	ForgotPasswordRequest,
	ResetPasswordRequest,
	VerifyResetCodeRequest,
} from "~/orval/touhouCloudDB.schemas"

import type { AuthApiResponse } from "./response"
import { REQUEST_FAILED_ERROR } from "./response"

const EMPTY_BODY_STATUS_CODES = new Set([204, 205, 304])
const JSON_CONTENT_TYPE = "application/json"

function buildJsonHeaders(headers?: HeadersInit) {
	const requestHeaders = new globalThis.Headers(headers)
	requestHeaders.set("Content-Type", JSON_CONTENT_TYPE)
	return requestHeaders
}

function parseResponseBody(
	body: string | null,
	contentType: string | null,
): unknown {
	if (body === null) return {}

	const trimmedBody = body.trim()
	if (trimmedBody.length === 0) return {}
	if (!contentType?.includes(JSON_CONTENT_TYPE)) return trimmedBody

	try {
		return JSON.parse(trimmedBody)
	} catch {
		return trimmedBody
	}
}

function postJson(url: string, body: unknown, options?: RequestInit) {
	return Effect.tryPromise({
		try: async (): Promise<AuthApiResponse> => {
			const res = await globalThis.fetch(url, {
				...options,
				method: "POST",
				headers: buildJsonHeaders(options?.headers),
				body: JSON.stringify(body),
			})

			const responseBody = EMPTY_BODY_STATUS_CODES.has(res.status)
				? null
				: await res.text()

			return {
				status: res.status,
				data: parseResponseBody(responseBody, res.headers.get("Content-Type")),
			}
		},
		catch: () => REQUEST_FAILED_ERROR,
	})
}

export function requestForgotPassword(
	request: ForgotPasswordRequest,
	options?: RequestInit,
) {
	return postJson(getForgotPasswordUrl(), request, options)
}

export function requestResetPassword(
	request: ResetPasswordRequest,
	options?: RequestInit,
) {
	return postJson(getResetPasswordUrl(), request, options)
}

export function requestVerifyResetCode(
	request: VerifyResetCodeRequest,
	options?: RequestInit,
) {
	return postJson(getVerifyResetCodeUrl(), request, options)
}
