import { Effect, pipe } from "effect"

import type { VerifyResetCodeRequest } from "~/orval/touhouCloudDB.schemas"

import type { AuthApiResponse, RequestFailedError } from "./response"
import {
	decodeResetPasswordSession,
	ensureSuccessResponse,
	getResetPasswordErrorMessage,
} from "./response"
import type { ResetPasswordSession } from "./session"
import type { ResetPasswordUiStore } from "./store"

export type VerifyResetCodeFn = (
	req: VerifyResetCodeRequest,
	options?: RequestInit,
) => Effect.Effect<AuthApiResponse, RequestFailedError>

export async function verifyResetCode(args: {
	email: string
	code: string
	verifyResetCode: VerifyResetCodeFn
	onSuccess(session: ResetPasswordSession): Promise<void>
	uiStore: ResetPasswordUiStore
}) {
	const { email, code, uiStore } = args

	uiStore.startVerifyCode()

	await Effect.runPromise(
		pipe(
			Effect.gen(function* () {
				const response = yield* args.verifyResetCode({
					email,
					code,
				})
				const responseBody = yield* ensureSuccessResponse(response)
				const session: ResetPasswordSession =
					yield* decodeResetPasswordSession(responseBody)

				yield* Effect.promise(() => args.onSuccess(session))
				yield* Effect.sync(() => {
					uiStore.endVerifyCodeWithSuccess()
				})
			}),
			Effect.catchAll((error) =>
				Effect.sync(() => {
					uiStore.endVerifyCodeWithError(getResetPasswordErrorMessage(error))
				}),
			),
		),
	)
}
