import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { splitProps } from "solid-js"
import type { ComponentProps, ParentProps } from "solid-js"

import { palette } from "~/style/color/palette.stylex"

import { colors } from "../style/tokens.stylex"

const styles = stylex.create({
	container: {
		containerType: "inline-size",
		width: "100%",
		height: "100%",
		backgroundColor: palette.slate[100],
	},
	page: {
		backgroundColor: colors.backgroundPrimary,
		height: "100%",
		"--page-width": { default: "72rem", "@media (min-width: 96rem)": "80rem" },
		maxWidth: "var(--page-width)",
		marginInline: "auto",
		borderInlineColor: palette.slate[300],
		borderInlineStyle: "solid",
		borderInlineWidth: "clamp(0px, 100cqw - var(--page-width), 1px)",
	},
})

export function PageLayout(
	props: ParentProps<Omit<ComponentProps<"div">, "class">> & {
		styles?: StyleXStyles
	},
) {
	const [local, rest] = splitProps(props, ["styles"])
	return (
		<div {...stylex.attrs(styles.container)}>
			<div
				{...rest}
				{...stylex.attrs(styles.page, local.styles)}
			></div>
		</div>
	)
}
