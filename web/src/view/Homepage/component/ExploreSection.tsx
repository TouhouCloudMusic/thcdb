import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { LinkComponentProps } from "@tanstack/solid-router"
import { ArrowRightIcon } from "@thc/icons/radix"
import type { JSX } from "solid-js"

import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: { display: "flex", flexDirection: "column", gap: px[16] },
	header: {
		display: "flex",
		alignItems: "baseline",
		justifyContent: "space-between",
	},
	title: {
		fontSize: fontSizes.xl,
		lineHeight: 1.4,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	explore: {
		display: "inline-flex",
		alignItems: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: {
			default: colors.textTertiary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
	},
	arrow: { marginInline: px[4], width: px[14], height: px[14] },
})

type ExploreSectionProps = {
	title: string
	to: LinkComponentProps["to"]
	children: JSX.Element
}

export function ExploreSection(props: ExploreSectionProps) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.root)}>
			<div {...stylex.attrs(styles.header)}>
				<h2 {...stylex.attrs(styles.title)}>{props.title}</h2>
				<Link
					to={props.to}
					class={stylex.attrs(link.base, styles.explore).class}
				>
					{t`Explore`}
					<ArrowRightIcon {...stylex.attrs(styles.arrow)} />
				</Link>
			</div>

			{props.children}
		</div>
	)
}
