import { Field, Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link, Navigate, useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createSignal, onMount, onCleanup, Show } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { VerifyEmail as FormSchema } from "~/domain/auth/schema"
import { useCurrentUser } from "~/state/user"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { VerificationCodeField } from "../component/VerificationCodeField"
import { authStyles } from "../styles"
import { getVerificationSession, setVerificationSession } from "./session"
import type { VerificationSession } from "./session"

const styles = stylex.create({
	formChild: {
		marginBlockEnd: { default: px[24], ":last-child": 0 },
	},
	form: { width: "100%" },
	recipient: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	submitInfo: {
		marginTop: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	actions: { display: "flex", gap: px[8] },
	verify: { height: px[36], width: "100%" },
	resend: { height: px[36] },
	signinPrompt: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	signinLink: {
		color: colors.textSecondary,
		textDecorationLine: "underline",
		textUnderlineOffset: "2px",
	},
})

function VerifyEmailForm(props: { session: VerificationSession }) {
	const { t } = useLingui()
	const nav = useNavigate()
	const userCtx = useCurrentUser()
	const form = createForm({ schema: FormSchema, initialInput: { code: "" } })
	const [submitError, setSubmitError] = createSignal<string>()
	const [submitInfo, setSubmitInfo] = createSignal<string>()
	const [now, setNow] = createSignal(Date.now())
	onMount(() => {
		const timer = globalThis.setInterval(() => setNow(Date.now()), 1000)
		onCleanup(() => globalThis.clearInterval(timer))
	})
	const resendCooldownSeconds = () =>
		Math.max(0, Math.ceil((props.session.resendAvailableAt - now()) / 1000))
	const handleSubmit = async (values: FormSchema) => {
		const email = props.session.email
		await userCtx.run(async () => {
			const result = await AuthApi.verifyEmail({
				body: { email, code: values.code },
			})
			if (Either.isLeft(result)) {
				setSubmitError(result.left.error)
				throw result.left
			}
		})
		setVerificationSession(undefined)
		await nav({ to: "/" })
	}
	const handleResend = async () => {
		if (
			props.session.requestStatus === "resending"
			|| props.session.resendAvailableAt > Date.now()
		)
			return
		setSubmitError(undefined)
		setSubmitInfo(undefined)
		const pending: VerificationSession = {
			...props.session,
			requestStatus: "resending",
		}
		setVerificationSession(pending)
		try {
			const result = await AuthApi.resendVerificationEmail({
				body: { email: pending.email },
			})
			if (getVerificationSession() !== pending) return
			if (Either.isLeft(result)) {
				setSubmitError(result.left.error)
				return
			}
			const receivedAt = Date.now()
			setNow(receivedAt)
			setVerificationSession({
				requestStatus: "idle",
				email: pending.email,
				resendAvailableAt:
					receivedAt + result.right.resend_cooldown_seconds * 1000,
			})
			setSubmitInfo(t`If eligible, a verification code has been sent.`)
		} finally {
			if (getVerificationSession() === pending)
				setVerificationSession({ ...pending, requestStatus: "idle" })
		}
	}
	return (
		<>
			<header {...stylex.attrs(authStyles.header)}>
				<h1 {...stylex.attrs(authStyles.title)}>{t`Verify email`}</h1>
				<p
					{...stylex.attrs(authStyles.description)}
				>{t`Enter the 6-digit code sent to your email.`}</p>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				{...stylex.attrs(styles.form)}
			>
				<Show when={props.session.email}>
					{(email) => (
						<div {...stylex.attrs(styles.formChild, styles.recipient)}>
							{t`Enter the code for ${email()}. If you did not receive one, use Resend.`}
						</div>
					)}
				</Show>

				<Field
					of={form}
					path={["code"]}
				>
					{(field) => (
						<VerificationCodeField
							field={field}
							styles={styles.formChild}
						/>
					)}
				</Field>

				<FormComp.ErrorMessage styles={styles.formChild}>
					{submitError()}
				</FormComp.ErrorMessage>
				<Show when={submitInfo()}>
					<div {...stylex.attrs(styles.formChild, styles.submitInfo)}>
						{submitInfo()}
					</div>
				</Show>

				<div {...stylex.attrs(styles.formChild, styles.actions)}>
					<Button
						type="submit"
						disabled={form.isSubmitting}
						appearance="solid"
						tone="reimu"
						size="sm"
						styles={styles.verify}
					>
						{t`Verify Email`}
					</Button>
					<Button
						type="button"
						onClick={() => {
							void handleResend()
						}}
						disabled={
							form.isSubmitting
							|| props.session.requestStatus === "resending"
							|| resendCooldownSeconds() > 0
						}
						appearance="soft"
						tone="gray"
						size="sm"
						styles={styles.resend}
					>
						{resendCooldownSeconds() > 0
							? `Resend (${resendCooldownSeconds()}s)`
							: t`Resend`}
					</Button>
				</div>

				<div {...stylex.attrs(styles.formChild, styles.signinPrompt)}>
					{t`Already have an account?`}{" "}
					<Link
						to="/auth/sign-in"
						class={stylex.attrs(link.base, link.text, styles.signinLink).class}
					>
						{t`Sign in`}
					</Link>
				</div>
			</Form>
		</>
	)
}

export function VerifyEmailPage() {
	return (
		<Show
			when={getVerificationSession()}
			fallback={
				<Navigate
					to="/auth/sign-up"
					replace
				/>
			}
		>
			{(session) => <VerifyEmailForm session={session()} />}
		</Show>
	)
}
