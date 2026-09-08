import * as stylex from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"

export const entityDetailStyles = stylex.create({
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
