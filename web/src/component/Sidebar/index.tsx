import * as stylex from "@stylexjs/stylex"

import { buttonStyles } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

export const sidebar = stylex.create({
	panel: {
		marginLeft: "auto",
		display: "flex",
		height: "100%",
		width: "100vw",
		maxWidth: px[240],
		overflow: "auto",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderTopColor: palette.reimu[600],
		backgroundColor: colors.backgroundPrimary,
	},
	item: {
		display: "flex",
		alignItems: "center",
		justifyContent: "flex-start",
		textAlign: "left",
		width: "100%",
		paddingBlock: px[4],
		paddingInline: px[4],
		fontWeight: 300,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[700],
	},
	content: { marginInline: px[4] },
	icon: {
		marginInline: px[4],
		width: px[16],
		height: px[16],
		color: palette.slate[600],
	},
})

export const sidebarLink = stylex.attrs(
	link.base,
	buttonStyles.base,
	buttonStyles.ghost,
	buttonStyles.gray,
	buttonStyles.ghostGray,
	sidebar.item,
).class
