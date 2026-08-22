import { useLingui } from "@lingui/solid/macro"
import { Navigate } from "@tanstack/solid-router"
import { Match, Switch } from "solid-js"

import type { AuthFormMode } from "../useAuthForm"
import { useAuthForm } from "../useAuthForm"
import { AuthCredentialForm } from "./AuthCredentialForm"
import { AuthLeftPanel } from "./AuthLeftPanel"
import { VerifyEmailForm } from "./VerifyEmailForm"

type AuthFormState = ReturnType<typeof useAuthForm>

function AuthMobileBrand() {
	const { t } = useLingui()

	return (
		<div class="mb-6 flex items-center gap-3 lg:hidden">
			<img
				src="/logo.svg"
				alt=""
				class="h-9 w-9"
			/>
			<div class="flex flex-col leading-none">
				<div class="text-xs font-medium tracking-[0.22em] text-secondary">
					TOUHOU CLOUD DB
				</div>
				<div class="text-xs text-tertiary">{t`Open doujin music database`}</div>
			</div>
		</div>
	)
}

function AuthFormHeading(props: { mode: AuthFormMode }) {
	const { t } = useLingui()
	const title = () => {
		if (props.mode === "sign_up") {
			return t`Create account`
		}

		if (props.mode === "verify_email") {
			return t`Verify email`
		}

		return t`Sign in`
	}
	const description = () => {
		if (props.mode === "sign_up") {
			return t`Create an account to continue.`
		}

		if (props.mode === "verify_email") {
			return t`Enter the 6-digit code sent to your email.`
		}

		return t`Use your account to continue.`
	}

	return (
		<div class="mb-6 space-y-1">
			<div class="text-primary text-3xl font-light tracking-tight">
				{title()}
			</div>
			<div class="text-sm text-tertiary">{description()}</div>
		</div>
	)
}

function AuthFormContent(props: { authForm: AuthFormState }) {
	const shouldRedirectToSignUp = () =>
		props.authForm.mode() === "verify_email"
		&& props.authForm.isMissingVerifyEmailSession()
	const shouldShowVerifyEmailForm = () =>
		props.authForm.mode() === "verify_email"
		&& !props.authForm.isMissingVerifyEmailSession()

	return (
		<Switch fallback={<AuthCredentialForm {...props.authForm} />}>
			<Match when={shouldRedirectToSignUp()}>
				<Navigate
					to="/auth"
					search={{ type: "sign_up" }}
				/>
			</Match>
			<Match when={shouldShowVerifyEmailForm()}>
				<VerifyEmailForm {...props.authForm} />
			</Match>
		</Switch>
	)
}

export function AuthForm() {
	const authForm = useAuthForm()
	const mode = authForm.mode

	return (
		<div class="h-full relative overflow-hidden bg-linear-to-br from-reimu-100 via-primary to-marisa-100">
			<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.65)_1px,transparent_1px)] bg-size-[22px_22px] opacity-55"></div>
			<div class="grid h-full w-full items-stretch lg:grid-cols-[1.05fr_0.95fr]">
				<AuthLeftPanel />

				<div class="flex flex-col justify-center border-t border-slate-300 bg-primary/70 px-4 py-12 backdrop-blur-sm sm:px-8 lg:border-l lg:border-t-0 xl:px-14">
					<div class="mx-auto w-full max-w-[420px]">
						<AuthMobileBrand />
						<AuthFormHeading mode={mode()} />
						<AuthFormContent authForm={authForm} />
					</div>
				</div>
			</div>
		</div>
	)
}
