import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		display: "grid",
		minHeight: px[96],
		placeItems: "center",
		borderRadius: 0,
		backgroundImage:
			"linear-gradient(to bottom right in oklab, color-mix(in oklab, white 75%, transparent) 0%, color-mix(in oklab, white 70%, transparent) 100%)",
	},
	label: {
		display: "inline-flex",
		alignItems: "center",
		gap: px[8],
		borderRadius: radius.full,
		backgroundColor: "color-mix(in oklab, white 85%, transparent)",
		paddingInline: px[12],
		paddingBlock: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: colors.textTertiary,
	},
	dot: {
		display: "inline-block",
		width: px[6],
		height: px[6],
		borderRadius: radius.full,
		backgroundColor: palette.slate[300],
	},
})

type HomeEmptySlotProps = {
	label?: string
	styles?: StyleXStyles
}

export function HomeEmptySlot(props: HomeEmptySlotProps) {
	const { t } = useLingui()

	return (
		<div {...stylex.attrs(styles.root, props.styles)}>
			<div {...stylex.attrs(styles.label)}>
				<span {...stylex.attrs(styles.dot)}></span>
				{props.label ?? t`No data`}
			</div>
		</div>
	)
}
