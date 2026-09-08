import * as stylex from "@stylexjs/stylex"

import { colors } from "../../style/tokens.stylex"

const styles = stylex.create({
	root: {
		marginInline: "auto",
		display: "flex",
		height: "100%",
		alignItems: "center",
		justifyContent: "center",
		color: colors.textSecondary,
	},
})

export function FieldArrayFallback() {
	return <li {...stylex.attrs(styles.root)}>Click `+` to add a new item</li>
}
