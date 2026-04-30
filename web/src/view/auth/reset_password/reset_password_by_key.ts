import { Effect, pipe } from "effect"

import type { Options as SdkOptions } from "~/hey-api/sdk.gen"
import type { ResetPasswordData } from "~/hey-api/types.gen"

import type { AuthApiResponse, RequestFailedError } from "./response"
import { ensureSuccessResponse, getResetPasswordErrorMessage } from "./response"
import type { ResetPasswordUiStore } from "./store"

export type ResetPasswordByKeyFn = (
	req: ResetPasswordData["body"],
	options?: SdkOptions<ResetPasswordData>,
) => Effect.Effect<AuthApiResponse, RequestFailedError>

export async function resetPasswordByKey(args: {
	password: string
	resetPasswordByKey: ResetPasswordByKeyFn
	onInvalidResetKey?(): void | Promise<void>
	onSuccess(): Promise<void>
	uiStore: ResetPasswordUiStore
	requestFailedMessage: string
	invalidOrExpiredResetKeyMessage: string
}) {
	const { password, uiStore } = args

	uiStore.startResetPassword()

	await Effect.runPromise(
		pipe(
			Effect.gen(function* () {
				const response = yield* args.resetPasswordByKey({
					password,
				})

				yield* ensureSuccessResponse(response, args.requestFailedMessage)
				yield* Effect.promise(() => args.onSuccess())
			}),
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					const message = getResetPasswordErrorMessage(
						error,
						args.requestFailedMessage,
					)

					if (
						message === args.invalidOrExpiredResetKeyMessage
						&& args.onInvalidResetKey
					) {
						yield* Effect.tryPromise({
							try: async () => {
								await args.onInvalidResetKey!()
							},
							catch: () => error,
						})
					}

					yield* Effect.sync(() => {
						uiStore.endResetPasswordWithError(message)
					})
				}),
			),
		),
	)
}
