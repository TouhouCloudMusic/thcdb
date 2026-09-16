import * as stylex from "@stylexjs/stylex"

export const textStyles = stylex.create({
	ellipsis: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
})
