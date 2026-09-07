import * as stylex from "@stylexjs/stylex"
import type { ParentProps } from "solid-js"

import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	message: {
		paddingTop: px[32],
		paddingBottom: px[32],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
})

export function CollectionStatusMessage(props: ParentProps) {
	return <div {...stylex.attrs(styles.message)}>{props.children}</div>
}
