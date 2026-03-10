import { Effect, pipe } from "effect"

import type { ForgotPasswordRequest } from "~/orval/touhouCloudDB.schemas"

import type { AuthApiResponse, RequestFailedError } from "./response"
import {
	decodeForgotPasswordPayload,
	ensureSuccessResponse,
	getResetPasswordErrorMessage,
} from "./response"
import type { ResetPasswordUiStore } from "./store"

export type ForgotPasswordFn = (
	req: ForgotPasswordRequest,
	options?: RequestInit,
) => Effect.Effect<AuthApiResponse, RequestFailedError>

export async function sendResetCode(args: {
	email: string
	forgotPassword: ForgotPasswordFn
	startCooldown(seconds: number): void
	uiStore: ResetPasswordUiStore
}) {
	const { email, uiStore } = args

	uiStore.startSendCode()

	await Effect.runPromise(
		pipe(
			Effect.gen(function* () {
				const response = yield* args.forgotPassword({ email })
				const responseBody = yield* ensureSuccessResponse(response)
				const data = yield* decodeForgotPasswordPayload(responseBody)

				yield* Effect.sync(() => {
					args.startCooldown(data.resendCooldownSeconds)
					uiStore.setVerificationCodeExpiresMinutes(
						data.verificationCodeExpiresMinutes,
					)
					uiStore.endSendCodeWithSuccess()
				})
			}),
			Effect.catchAll((error) =>
				Effect.sync(() => {
					uiStore.endSendCodeWithError(getResetPasswordErrorMessage(error))
				}),
			),
		),
	)
}
