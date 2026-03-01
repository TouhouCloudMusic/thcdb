import type { ForgotPasswordRequest } from "~/orval/touhouCloudDB.schemas"

import {
	extractForgotPasswordPayload,
	getApiErrorMessage,
	REQUEST_FAILED_MESSAGE,
} from "./response"
import type { AuthApiResponse } from "./response"
import type { ResetPasswordUiStore } from "./store"

export type ForgotPasswordFn = (
	req: ForgotPasswordRequest,
	options?: RequestInit,
) => Promise<AuthApiResponse>

export async function sendResetCode(args: {
	email: string
	forgotPassword: ForgotPasswordFn
	startCooldown(seconds: number): void
	uiStore: ResetPasswordUiStore
}) {
	const { email, uiStore } = args

	uiStore.startSendCode()

	try {
		const res = await args.forgotPassword({ email })

		if (res.status !== 200) {
			uiStore.endSendCodeWithError(getApiErrorMessage(res.data))
			return
		}

		const data = extractForgotPasswordPayload(res.data)
		if (data === undefined) {
			uiStore.endSendCodeWithError(REQUEST_FAILED_MESSAGE)
			return
		}

		args.startCooldown(data.resendCooldownSeconds)
		uiStore.setVerificationCodeExpiresMinutes(
			data.verificationCodeExpiresMinutes,
		)
		uiStore.endSendCodeWithSuccess()
	} catch {
		uiStore.endSendCodeWithError(REQUEST_FAILED_MESSAGE)
	}
}
