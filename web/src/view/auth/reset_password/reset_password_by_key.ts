import type { ResetPasswordRequest } from "~/orval/touhouCloudDB.schemas"

import { getApiErrorMessage, REQUEST_FAILED_MESSAGE } from "./response"
import type { AuthApiResponse } from "./response"
import type { ResetPasswordUiStore } from "./store"

const INVALID_OR_EXPIRED_RESET_KEY_MESSAGE = "Invalid or expired reset key"

export type ResetPasswordByKeyFn = (
	req: ResetPasswordRequest,
	options?: RequestInit,
) => Promise<AuthApiResponse>

export async function resetPasswordByKey(args: {
	password: string
	resetPasswordByKey: ResetPasswordByKeyFn
	onInvalidResetKey?(): void | Promise<void>
	onSuccess(): void | Promise<void>
	uiStore: ResetPasswordUiStore
}) {
	const { password, uiStore } = args

	uiStore.startResetPassword()

	try {
		const res = await args.resetPasswordByKey({
			key: "",
			password,
		})

		if (res.status !== 200) {
			const message = getApiErrorMessage(res.data)

			if (
				message === INVALID_OR_EXPIRED_RESET_KEY_MESSAGE
				&& args.onInvalidResetKey
			) {
				await args.onInvalidResetKey()
			}

			uiStore.endResetPasswordWithError(message)
			return
		}
	} catch {
		uiStore.endResetPasswordWithError(REQUEST_FAILED_MESSAGE)
		return
	}

	await args.onSuccess()
}
