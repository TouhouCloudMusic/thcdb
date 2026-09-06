import { Field, Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { Navigate, useNavigate } from "@tanstack/solid-router"
import { onCleanup, onMount } from "solid-js"
import type * as v from "valibot"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { ResetPassword as ResetPasswordSchema } from "~/domain/auth/schema"

import { PasswordField } from "../component/PasswordField"
import {
	AUTH_DESCRIPTION_CLASS,
	AUTH_HEADER_CLASS,
	AUTH_TITLE_CLASS,
} from "../styles"
import { requestResetPassword } from "./request"
import { resetPasswordByKey } from "./reset_password_by_key"
import {
	clearResetPasswordSession,
	clearResetPasswordSuccess,
	getResetPasswordSession,
	markResetPasswordSessionInvalid,
	markResetPasswordSuccess,
} from "./session"
import { createResetPasswordUiStore } from "./store"

type ResetPasswordValues = v.InferOutput<typeof ResetPasswordSchema>

function formatMinuteCount(minutes: number) {
	return `${minutes} minute${minutes === 1 ? "" : "s"}`
}

export function ResetPasswordPage() {
	const resetSession = getResetPasswordSession()
	if (resetSession === undefined) {
		markResetPasswordSessionInvalid()
		return <Navigate to="/auth/forgot-password" />
	}

	const { t } = useLingui()
	const nav = useNavigate()
	const uiStore = createResetPasswordUiStore()
	let expiryTimer: ReturnType<typeof globalThis.setTimeout> | undefined
	const form = createForm({
		schema: ResetPasswordSchema,
		initialInput: {
			password: "",
			repeated_password: "",
		},
	})

	const clearExpiryTimer = () => {
		if (expiryTimer === undefined) return
		globalThis.clearTimeout(expiryTimer)
		expiryTimer = undefined
	}

	const redirectToForgotPassword = async () => {
		clearExpiryTimer()
		clearResetPasswordSession()
		clearResetPasswordSuccess()
		markResetPasswordSessionInvalid()
		await nav({ to: "/auth/forgot-password" })
	}

	onCleanup(clearExpiryTimer)

	onMount(() => {
		const remainingMs = resetSession.expiresAtMs - Date.now()

		if (remainingMs <= 0) {
			void redirectToForgotPassword()
			return
		}

		expiryTimer = globalThis.setTimeout(() => {
			void redirectToForgotPassword()
		}, remainingMs)
	})

	const handleSubmit = async (values: ResetPasswordValues) => {
		await resetPasswordByKey({
			password: values.password,
			onInvalidResetKey: redirectToForgotPassword,
			resetPasswordByKey: requestResetPassword,
			requestFailedMessage: t`Request failed`,
			invalidOrExpiredResetKeyMessage: t`Invalid or expired reset key`,
			onSuccess: async () => {
				clearExpiryTimer()
				markResetPasswordSuccess()
				await nav({ to: "/auth/reset-password/success" })
			},
			uiStore,
		})
	}

	return (
		<>
			<header class={AUTH_HEADER_CLASS}>
				<h1 class={AUTH_TITLE_CLASS}>{t`Set a new password`}</h1>
				<p
					class={AUTH_DESCRIPTION_CLASS}
				>{t`This is valid for ${formatMinuteCount(resetSession.keyExpiresMinutes)}.`}</p>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				class="w-full"
			>
				<Field
					of={form}
					path={["password"]}
				>
					{(field) => (
						<PasswordField
							label={t`New password`}
							field={field}
							showRequirementHint
						/>
					)}
				</Field>

				<Field
					of={form}
					path={["repeated_password"]}
				>
					{(field) => (
						<PasswordField
							label={t`Repeat new password`}
							field={field}
							class="mt-4"
						/>
					)}
				</Field>

				<FormComp.ErrorMessage>
					{uiStore.state.resetPasswordError}
				</FormComp.ErrorMessage>

				<Button
					type="submit"
					variant="Primary"
					color="Reimu"
					size="Sm"
					class="mt-6 h-9 w-full"
					disabled={form.isSubmitting}
				>
					{t`Reset password`}
				</Button>
			</Form>
		</>
	)
}
