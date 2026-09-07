import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { For } from "solid-js"

import type { HomeStatistics } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { formatCount } from "~/view/Homepage/utils"

const styles = stylex.create({
	grid: {
		display: "grid",
		width: { default: "100%", "@media (min-width: 48rem)": "fit-content" },
		gridTemplateColumns: {
			default: "repeat(2,minmax(0,1fr))",
			"@media (min-width: 48rem)": "repeat(4,minmax(0,1fr))",
		},
		columnGap: { default: px[32], "@media (min-width: 48rem)": px[64] },
		rowGap: px[24],
	},
	stat: { minWidth: { default: null, "@media (min-width: 48rem)": px[112] } },
	count: {
		fontSize: fontSizes["3xl"],
		lineHeight: 1.2,
		fontWeight: 200,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
		fontVariantNumeric: "tabular-nums",
	},
	label: {
		marginTop: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 300,
		letterSpacing: "0.1em",
		color: colors.textTertiary,
		textTransform: "uppercase",
	},
	root: {
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
		paddingInline: {
			default: px[16],
			"@media (min-width: 40rem)": px[24],
			"@media (min-width: 64rem)": px[32],
		},
		paddingBlock: px[12],
	},
})

function HomeStatsGrid(props: { statistics?: HomeStatistics }) {
	const { t } = useLingui()
	const stats = () =>
		[
			{ key: "releases", label: t`Releases` },
			{ key: "songs", label: t`Songs` },
			{ key: "artists", label: t`Artists` },
			{ key: "tags", label: t`Tags` },
		] satisfies { key: keyof HomeStatistics; label: string }[]

	return (
		<div {...stylex.attrs(styles.grid)}>
			<For each={stats()}>
				{(stat) => (
					<div {...stylex.attrs(styles.stat)}>
						<div {...stylex.attrs(styles.count)}>
							{formatCount(props.statistics?.[stat.key])}
						</div>
						<div {...stylex.attrs(styles.label)}>{stat.label}</div>
					</div>
				)}
			</For>
		</div>
	)
}

export function HomeStats(props: { statistics?: HomeStatistics }) {
	const { t } = useLingui()
	return (
		<section
			aria-label={t`Database statistics`}
			{...stylex.attrs(styles.root)}
		>
			<HomeStatsGrid statistics={props.statistics} />
		</section>
	)
}
