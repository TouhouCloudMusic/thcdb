import type { VerifyResetCodeRequest } from "~/orval/touhouCloudDB.schemas"

import {
	extractResetPasswordSession,
	getApiErrorMessage,
	REQUEST_FAILED_MESSAGE,
} from "./response"
import type { AuthApiResponse } from "./response"
import type { ResetPasswordSession } from "./session"
import type { ResetPasswordUiStore } from "./store"

export type VerifyResetCodeFn = (
	req: VerifyResetCodeRequest,
	options?: RequestInit,
) => Promise<AuthApiResponse>

export async function verifyResetCode(args: {
	email: string
	code: string
	verifyResetCode: VerifyResetCodeFn
	onSuccess(session: ResetPasswordSession): void | Promise<void>
	uiStore: ResetPasswordUiStore
}) {
	const { email, code, uiStore } = args
	let session: ResetPasswordSession

	uiStore.startVerifyCode()

	try {
		const res = await args.verifyResetCode({
			email,
			code,
		})

		if (res.status !== 200) {
			uiStore.endVerifyCodeWithError(getApiErrorMessage(res.data))
			return
		}

		const nextSession = extractResetPasswordSession(res.data)
		if (nextSession === undefined) {
			uiStore.endVerifyCodeWithError(REQUEST_FAILED_MESSAGE)
			return
		}

		session = nextSession
	} catch {
		uiStore.endVerifyCodeWithError(REQUEST_FAILED_MESSAGE)
		return
	}

	await args.onSuccess(session)
	uiStore.endVerifyCodeWithSuccess()
}
