import { useLingui } from "@lingui/solid/macro"
import { Link, Navigate } from "@tanstack/solid-router"
import { onMount } from "solid-js"

import {
	AUTH_DESCRIPTION_CLASS,
	AUTH_HEADER_CLASS,
	AUTH_TITLE_CLASS,
} from "../styles"
import { clearResetPasswordSession, hasResetPasswordSuccess } from "./session"

export function ResetPasswordSuccessPage() {
	if (!hasResetPasswordSuccess()) {
		return <Navigate to="/auth/forgot-password" />
	}

	const { t } = useLingui()

	onMount(clearResetPasswordSession)

	return (
		<>
			<header class={AUTH_HEADER_CLASS}>
				<h1 class={AUTH_TITLE_CLASS}>{t`Password reset complete`}</h1>
				<p
					class={AUTH_DESCRIPTION_CLASS}
				>{t`Your password has been updated successfully.`}</p>
			</header>
			<div class="space-y-4">
				<div class="text-sm text-tertiary">
					{t`You can now sign in with your new password.`}
				</div>
				<div class="text-sm text-tertiary">
					{t`Back to`}{" "}
					<Link
						to="/auth/sign-in"
						class="text-secondary underline underline-offset-2"
					>
						{t`sign in`}
					</Link>
					.
				</div>
			</div>
		</>
	)
}
