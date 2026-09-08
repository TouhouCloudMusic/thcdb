import { Field, Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Navigate, useNavigate } from "@tanstack/solid-router"
import { onCleanup, onMount } from "solid-js"
import type * as v from "valibot"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { ResetPassword as ResetPasswordSchema } from "~/domain/auth/schema"
import { px } from "~/style/tokens.stylex"

import { PasswordField } from "../component/PasswordField"
import { authStyles } from "../styles"
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

const styles = stylex.create({
	form: { width: "100%" },
	confirmation: { marginTop: px[16] },
	submit: { marginTop: px[24], height: px[36], width: "100%" },
})

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
			<header {...stylex.attrs(authStyles.header)}>
				<h1 {...stylex.attrs(authStyles.title)}>{t`Set a new password`}</h1>
				<p
					{...stylex.attrs(authStyles.description)}
				>{t`This is valid for ${formatMinuteCount(resetSession.keyExpiresMinutes)}.`}</p>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				{...stylex.attrs(styles.form)}
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
							styles={styles.confirmation}
						/>
					)}
				</Field>

				<FormComp.ErrorMessage>
					{uiStore.state.resetPasswordError}
				</FormComp.ErrorMessage>

				<Button
					type="submit"
					disabled={form.isSubmitting}
					appearance="solid"
					tone="reimu"
					size="sm"
					styles={styles.submit}
				>
					{t`Reset password`}
				</Button>
			</Form>
		</>
	)
}
