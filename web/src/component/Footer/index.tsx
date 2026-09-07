import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"

import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	brand: {
		display: "grid",
		gridTemplateRows: "repeat(4,20px)",
		alignItems: "center",
		rowGap: px[8],
	},
	title: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 600,
		letterSpacing: ".025em",
	},
	description: {
		maxWidth: "65ch",
		fontSize: fontSizes.xs,
		lineHeight: 1.625,
		color: palette.slate[400],
	},
	links: {
		display: "flex",
		alignItems: "center",
		columnGap: px[16],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[300],
	},
	copyright: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	footer: {
		backgroundColor: palette.slate[900],
		color: palette.slate[200],
		paddingInline: {
			default: px[16],
			"@media (min-width: 40rem)": px[24],
			"@media (min-width: 64rem)": "clamp(2rem,calc(5vw - 2.5rem),3.5rem)",
		},
		paddingTop: { default: px[16], "@media (min-width: 40rem)": px[32] },
		paddingBottom: { default: px[32], "@media (min-width: 40rem)": px[48] },
	},
	link: {
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(.4,0,.2,1)",
		textUnderlineOffset: "4px",
		color: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": palette.white },
		},
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
})

const GITHUB_REPO_URL = "https://github.com/TouhouCloudMusic/thcdb"
const ZULIP_URL = "https://touhoucloud.zulipchat.com/"
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`
const CURRENT_YEAR = new Date().getFullYear()

type FooterLinkItem = {
	label: string
	href: string
	external?: boolean
}

function BrandColumn() {
	const { t } = useLingui()
	const brandLinks: FooterLinkItem[] = [
		{ label: "GitHub", href: GITHUB_REPO_URL, external: true },
		{ label: t`Zulip`, href: ZULIP_URL, external: true },
		{
			label: t`Feedback`,
			href: GITHUB_ISSUES_URL,
			external: true,
		},
	]

	return (
		<div {...stylex.attrs(styles.brand)}>
			<div {...stylex.attrs(styles.title)}>{t`Touhou Cloud DB`}</div>
			<p {...stylex.attrs(styles.description)}>
				{t`Touhou Cloud DB is an open doujin music database`}
			</p>
			<div {...stylex.attrs(styles.links)}>
				<For each={brandLinks}>
					{(item) => (
						<a
							href={item.href}
							target={item.external ? "_blank" : undefined}
							rel={item.external ? "noreferrer noopener" : undefined}
							{...stylex.attrs(styles.link)}
						>
							{item.label}
						</a>
					)}
				</For>
			</div>
			<div {...stylex.attrs(styles.copyright)}>
				<span>© {CURRENT_YEAR} THCDB</span>
			</div>
		</div>
	)
}

export function Footer() {
	return (
		<footer {...stylex.attrs(styles.footer)}>
			<BrandColumn />
		</footer>
	)
}
