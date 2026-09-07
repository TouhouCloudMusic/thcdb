import * as stylex from "@stylexjs/stylex"
import { createFileRoute, Outlet, useLocation } from "@tanstack/solid-router"
import { createMemo } from "solid-js"

import { PageLayout } from "~/layout/PageLayout"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { NotSignedIn } from "~/view/auth/component/Guard"

const styles = stylex.create({
	signUpContent: { minHeight: px[464] },
	successContent: { minHeight: px[176] },
	forgotPasswordContent: { minHeight: px[272] },
	defaultContent: { minHeight: px[304] },
	page: {
		paddingInline: { default: px[16], "@media (min-width: 40rem)": px[24] },
		paddingBottom: { default: px[32], "@media (min-width: 40rem)": px[64] },
		paddingTop: {
			default: px[32],
			"@media (min-width: 40rem)": px[80],
			"@media (max-height:40rem)": px[32],
		},
	},
	content: { marginInline: "auto", width: "100%", maxWidth: px[400] },
	brand: {
		marginBottom: px[24],
		display: "flex",
		alignItems: "center",
		gap: px[12],
	},
	logo: { width: px[32], height: px[32] },
	brandName: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
})

export const Route = createFileRoute("/auth")({
	component: RouteComponent,
})

function RouteComponent() {
	const location = useLocation()
	const contentHeight = createMemo(() => {
		switch (location().pathname) {
			case "/auth/sign-up": {
				return styles.signUpContent
			}
			case "/auth/reset-password/success": {
				return styles.successContent
			}
			case "/auth/forgot-password": {
				return styles.forgotPasswordContent
			}
			default: {
				return styles.defaultContent
			}
		}
	})
	return (
		<PageLayout styles={styles.page}>
			<div {...stylex.attrs(styles.content)}>
				<div {...stylex.attrs(styles.brand)}>
					<img
						src="/logo.svg"
						alt=""
						{...stylex.attrs(styles.logo)}
					/>
					<span {...stylex.attrs(styles.brandName)}>Touhou Cloud DB</span>
				</div>
				<div {...stylex.attrs(contentHeight())}>
					<NotSignedIn>
						<Outlet />
					</NotSignedIn>
				</div>
			</div>
		</PageLayout>
	)
}
