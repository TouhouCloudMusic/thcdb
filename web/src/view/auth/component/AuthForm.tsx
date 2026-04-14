import { useLingui } from "@lingui/solid/macro"
import { Navigate } from "@tanstack/solid-router"
import { Match, Switch, createMemo } from "solid-js"

import { useAuthForm } from "../store"
import { AuthCredentialForm } from "./AuthCredentialForm"
import { AuthLeftPanel } from "./AuthLeftPanel"
import { VerifyEmailForm } from "./VerifyEmailForm"

export function AuthForm() {
	const { t } = useLingui()
	const authForm = useAuthForm()
	const mode = authForm.mode
	const formCopy = createMemo(() => {
		if (mode() === "sign_up") {
			return {
				title: t`Create account`,
				description: t`Create an account to continue.`,
			}
		}

		if (mode() === "verify_email") {
			return {
				title: t`Verify email`,
				description: t`Enter the 6-digit code sent to your email.`,
			}
		}

		return {
			title: t`Sign in`,
			description: t`Use your account to continue.`,
		}
	})

	return (
		<div class="h-full relative overflow-hidden bg-linear-to-br from-reimu-100 via-primary to-marisa-100">
			<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.65)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.65)_1px,transparent_1px)] bg-size-[22px_22px] opacity-55"></div>
			<div class="grid h-full w-full items-stretch lg:grid-cols-[1.05fr_0.95fr]">
				<AuthLeftPanel />

				<div class="flex flex-col justify-center border-t border-slate-300 bg-primary/70 px-4 py-12 backdrop-blur-sm sm:px-8 lg:border-l lg:border-t-0 xl:px-14">
					<div class="mx-auto w-full max-w-[420px]">
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
								<div class="text-xs text-tertiary">
									{t`Open doujin music database`}
								</div>
							</div>
						</div>

						<div class="mb-6 space-y-1">
							<div class="text-primary text-3xl font-light tracking-tight">
								{formCopy().title}
							</div>
							<div class="text-sm text-tertiary">{formCopy().description}</div>
						</div>

						<Switch fallback={<AuthCredentialForm {...authForm} />}>
							<Match
								when={
									mode() === "verify_email"
									&& authForm.isMissingVerifyEmailSession()
								}
							>
								<Navigate
									to="/auth"
									search={{ type: "sign_up" }}
								/>
							</Match>
							<Match when={mode() === "verify_email"}>
								<VerifyEmailForm {...authForm} />
							</Match>
						</Switch>
					</div>
				</div>
			</div>
		</div>
	)
}
