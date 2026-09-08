import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link, Navigate } from "@tanstack/solid-router"
import type { ParentProps } from "solid-js"
import { Match, Switch } from "solid-js"

import { buttonStyles } from "~/component/atomic/button"
import { hasAdminRole } from "~/domain/user/authorization"
import { useCurrentUser } from "~/state/user"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { radius, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	page: {
		display: "grid",
		minHeight: "60vh",
		placeItems: "center",
		paddingInline: px[24],
		paddingBlock: px[56],
	},
	loading: {
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		paddingInline: px[20],
		paddingBlock: px[16],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / .05)",
	},
	card: {
		width: "100%",
		maxWidth: px[448],
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		padding: px[24],
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / .05)",
	},
	eyebrow: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: ".22em",
		color: palette.slate[500],
	},
	title: {
		marginTop: px[12],
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		fontWeight: 300,
		color: palette.slate[900],
	},
	description: {
		marginTop: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	actions: {
		marginTop: px[20],
		display: "flex",
		flexWrap: "wrap",
		gap: px[12],
	},
})

export function SessionLoading() {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.page)}>
			<div {...stylex.attrs(styles.loading)}>{t`Checking session…`}</div>
		</div>
	)
}

function AuthRequired() {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.page)}>
			<div {...stylex.attrs(styles.card)}>
				<div {...stylex.attrs(styles.eyebrow)}>{t`AUTH REQUIRED`}</div>
				<div {...stylex.attrs(styles.title)}>{t`Sign in to continue`}</div>
				<div {...stylex.attrs(styles.description)}>
					{t`This page requires an authenticated account.`}
				</div>

				<div {...stylex.attrs(styles.actions)}>
					<Link
						to="/auth/sign-in"
						class={
							stylex.attrs(
								link.base,
								buttonStyles.base,
								buttonStyles.solid,
								buttonStyles.reimu,
							).class
						}
					>
						{t`Sign in`}
					</Link>
					<Link
						to="/auth/sign-up"
						class={
							stylex.attrs(
								link.base,
								buttonStyles.base,
								buttonStyles.soft,
								buttonStyles.slate,
								buttonStyles.softDarkHover,
							).class
						}
					>
						{t`Create account`}
					</Link>
				</div>
			</div>
		</div>
	)
}

export function AuthGuard(props: ParentProps) {
	const userCtx = useCurrentUser()

	return (
		<Switch fallback={<AuthRequired />}>
			<Match when={userCtx.session.status === "loading"}>
				<SessionLoading />
			</Match>
			<Match when={userCtx.session.status === "authenticated"}>
				{props.children}
			</Match>
		</Switch>
	)
}

export function AdminGuard(props: ParentProps) {
	const userCtx = useCurrentUser()

	return (
		<Switch fallback={<Navigate to="/" />}>
			<Match when={userCtx.session.status === "loading"}>
				<SessionLoading />
			</Match>
			<Match when={hasAdminRole(userCtx.authorization)}>{props.children}</Match>
		</Switch>
	)
}
