import { Field, Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { Navigate, useNavigate } from "@tanstack/solid-router"
import { AuthApi } from "@thc/api"
import { Either } from "effect"
import { createSignal, onMount, onCleanup, Show } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { VerifyEmail as FormSchema } from "~/domain/auth/schema"
import { useCurrentUser } from "~/state/user"

import { VerificationCodeField } from "../component/VerificationCodeField"
import {
	AUTH_HEADER_CLASS,
	AUTH_TITLE_CLASS,
	AUTH_DESCRIPTION_CLASS,
} from "../styles"
import { getVerificationSession, setVerificationSession } from "./session"
import type { VerificationSession } from "./session"

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
			<header class={AUTH_HEADER_CLASS}>
				<h1 class={AUTH_TITLE_CLASS}>{t`Verify email`}</h1>
				<p
					class={AUTH_DESCRIPTION_CLASS}
				>{t`Enter the 6-digit code sent to your email.`}</p>
			</header>
			<Form
				of={form}
				onSubmit={handleSubmit}
				class="w-full space-y-6"
			>
				<Show when={props.session.email}>
					{(email) => (
						<div class="text-sm text-secondary">
							{t`Enter the code for ${email()}. If you did not receive one, use Resend.`}
						</div>
					)}
				</Show>

				<Field
					of={form}
					path={["code"]}
				>
					{(field) => <VerificationCodeField field={field} />}
				</Field>

				<FormComp.ErrorMessage>{submitError()}</FormComp.ErrorMessage>
				<Show when={submitInfo()}>
					<div class="mt-2 text-sm text-secondary">{submitInfo()}</div>
				</Show>

				<div class="flex gap-2">
					<Button
						type="submit"
						variant="Primary"
						color="Reimu"
						size="Sm"
						class="h-9 w-full"
						disabled={form.isSubmitting}
					>
						{t`Verify Email`}
					</Button>
					<Button
						type="button"
						variant="Secondary"
						size="Sm"
						class="h-9"
						onClick={() => {
							void handleResend()
						}}
						disabled={
							form.isSubmitting
							|| props.session.requestStatus === "resending"
							|| resendCooldownSeconds() > 0
						}
					>
						{resendCooldownSeconds() > 0
							? `Resend (${resendCooldownSeconds()}s)`
							: t`Resend`}
					</Button>
				</div>

				<div class="text-sm text-tertiary">
					{t`Already have an account?`}{" "}
					<Link
						to="/auth/sign-in"
						class="text-secondary underline underline-offset-2"
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
