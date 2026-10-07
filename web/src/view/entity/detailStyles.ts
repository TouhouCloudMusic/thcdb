import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"

export const entityDetailStyles = stylex.create({
	tags: {
		width: "fit-content",
		minWidth: `min(${px[384]}, 100%)`,
		maxWidth: "100%",
		overflowWrap: "anywhere",
	},
	collectionActions: {
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		display: { default: "flex", ":empty": "none" },
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[8],
		borderColor: palette.slate[200],
		paddingTop: px[16],
	},
})
