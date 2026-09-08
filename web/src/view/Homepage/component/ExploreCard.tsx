import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"

import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import {
	radius,
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import type { HomeNavItem } from "~/view/Homepage/mock"

const styles = stylex.create({
	link: {
		display: "block",
	},
	root: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		justifyContent: "space-between",
		gap: px[16],
		borderRadius: 0,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: palette.slate[300],
		padding: px[20],
		boxShadow: {
			default:
				"inset 0 0 0 1px var(--explore-ring), 0 1px 2px 0 rgb(0 0 0 / 0.05)",
			":hover": {
				default: null,
				"@media (hover: hover)":
					"inset 0 0 0 1px var(--explore-ring), 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
			},
		},
		transitionProperty: {
			default: "all",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		translate: {
			default: null,
			":hover": {
				default: null,
				"@media (hover: hover)": "0 -0.125rem",
				"@media (hover: hover) and (prefers-reduced-motion: reduce)": "0 0",
			},
		},
	},
	header: {
		display: "flex",
		alignItems: "start",
		justifyContent: "space-between",
		gap: px[16],
	},
	heading: { display: "flex", flexDirection: "column", gap: px[8] },
	badge: {
		display: "inline-flex",
		width: "fit-content",
		alignItems: "center",
		gap: px[8],
		borderRadius: radius.full,
		paddingInline: px[12],
		paddingBlock: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
	},
	dot: {
		display: "inline-block",
		width: px[6],
		height: px[6],
		borderRadius: radius.full,
		backgroundColor: "currentColor",
		opacity: 0.7,
	},
	title: {
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		fontWeight: 500,
		color: colors.textPrimary,
	},
	arrow: {
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: {
			default: colors.textTertiary,
			"@media (hover: hover)": {
				[stylex.when.ancestor(":hover")]: colors.textSecondary,
			},
		},
		transitionProperty: {
			default:
				"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
			"@media (prefers-reduced-motion: reduce)": "none",
		},
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	description: {
		fontSize: fontSizes.sm,
		lineHeight: 1.625,
		color: colors.textSecondary,
	},
})
const cardAccentStyles = stylex.create({
	Reimu: {
		"--explore-ring": {
			default: palette.reimu[200],
			":hover": { default: null, "@media (hover: hover)": palette.reimu[300] },
		},
	},
	Marisa: {
		"--explore-ring": {
			default: palette.marisa[200],
			":hover": { default: null, "@media (hover: hover)": palette.marisa[300] },
		},
	},
	Blue: {
		"--explore-ring": {
			default: palette.blue[200],
			":hover": { default: null, "@media (hover: hover)": palette.blue[300] },
		},
	},
	Green: {
		"--explore-ring": {
			default: palette.green[200],
			":hover": { default: null, "@media (hover: hover)": palette.green[300] },
		},
	},
	Slate: {
		"--explore-ring": {
			default: palette.slate[200],
			":hover": { default: null, "@media (hover: hover)": palette.slate[300] },
		},
	},
})
const badgeAccentStyles = stylex.create({
	Reimu: {
		backgroundColor: palette.reimu[100],
		color: palette.reimu[800],
		boxShadow: `inset 0 0 0 1px ${palette.reimu[200]}`,
	},
	Marisa: {
		backgroundColor: palette.marisa[100],
		color: palette.marisa[800],
		boxShadow: `inset 0 0 0 1px ${palette.marisa[200]}`,
	},
	Blue: {
		backgroundColor: palette.blue[100],
		color: palette.blue[800],
		boxShadow: `inset 0 0 0 1px ${palette.blue[200]}`,
	},
	Green: {
		backgroundColor: palette.green[100],
		color: palette.green[800],
		boxShadow: `inset 0 0 0 1px ${palette.green[200]}`,
	},
	Slate: {
		backgroundColor: palette.slate[100],
		color: colors.textPrimary,
		boxShadow: `inset 0 0 0 1px ${palette.slate[200]}`,
	},
})
type ExploreCardProps = {
	item: HomeNavItem
}

export function ExploreCard(props: ExploreCardProps) {
	const { t } = useLingui()
	const title = () => {
		switch (props.item.to) {
			case "/artist/explore": {
				return t`Artists`
			}
			case "/release/explore": {
				return t`Releases`
			}
			case "/song/explore": {
				return t`Songs`
			}
			case "/tag/explore": {
				return t`Tags`
			}
			case "/event/explore": {
				return t`Events`
			}
			case "/label/explore": {
				return t`Labels`
			}
		}
	}
	const description = () => {
		switch (props.item.to) {
			case "/artist/explore": {
				return t`Browse circles and solo creators with filters and sorting.`
			}
			case "/release/explore": {
				return t`Track albums and compilations, link artists and events.`
			}
			case "/song/explore": {
				return t`Find tracks by title language, credits, and corrections.`
			}
			case "/tag/explore": {
				return t`Navigate genres, themes and metadata through tag types.`
			}
			case "/event/explore": {
				return t`See conventions and live shows where releases debuted.`
			}
			case "/label/explore": {
				return t`Explore labels, imprint history and founded/dissolved dates.`
			}
		}
	}
	return (
		<Link
			to={props.item.to}
			class={stylex.attrs(link.base, stylex.defaultMarker(), styles.link).class}
		>
			<div
				{...stylex.attrs(
					surfaceStyles.card,
					styles.root,
					cardAccentStyles[props.item.accent],
				)}
			>
				<div {...stylex.attrs(styles.header)}>
					<div {...stylex.attrs(styles.heading)}>
						<div
							{...stylex.attrs(
								styles.badge,
								badgeAccentStyles[props.item.accent],
							)}
						>
							<span {...stylex.attrs(styles.dot)}></span>
							{t`Explore`}
						</div>
						<div {...stylex.attrs(styles.title)}>{title()}</div>
					</div>
					<div {...stylex.attrs(styles.arrow)}>→</div>
				</div>

				<div {...stylex.attrs(styles.description)}>{description()}</div>
			</div>
		</Link>
	)
}
