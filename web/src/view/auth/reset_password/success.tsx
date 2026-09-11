import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link, Navigate } from "@tanstack/solid-router"
import { onMount, Show } from "solid-js"

import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { authStyles } from "../styles"
import { clearResetPasswordSession, hasResetPasswordSuccess } from "./session"

const styles = stylex.create({
	message: {
		marginBlockEnd: { default: 0, ":not(:last-child)": px[16] },
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	signinPrompt: {
		marginBlockEnd: { default: 0, ":not(:last-child)": px[16] },
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

function ResetPasswordSuccessContent() {
	const { t } = useLingui()

	onMount(clearResetPasswordSession)

	return (
		<>
			<header {...stylex.attrs(authStyles.header)}>
				<h1
					{...stylex.attrs(authStyles.title)}
				>{t`Password reset complete`}</h1>
				<p
					{...stylex.attrs(authStyles.description)}
				>{t`Your password has been updated successfully.`}</p>
			</header>
			<div>
				<div {...stylex.attrs(styles.message)}>
					{t`You can now sign in with your new password.`}
				</div>
				<div {...stylex.attrs(styles.signinPrompt)}>
					{t`Back to`}{" "}
					<Link
						to="/auth/sign-in"
						{...stylex.attrs(styles.signinLink)}
					>
						{t`sign in`}
					</Link>
					.
				</div>
			</div>
		</>
	)
}

export function ResetPasswordSuccessPage() {
	return (
		<Show
			when={hasResetPasswordSuccess()}
			fallback={<Navigate to="/auth/forgot-password" />}
		>
			<ResetPasswordSuccessContent />
		</Show>
	)
}
