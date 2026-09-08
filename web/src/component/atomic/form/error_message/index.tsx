import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { JSX } from "solid-js"
import { splitProps, Show } from "solid-js"
import { Dynamic } from "solid-js/web"

import { palette } from "~/style/color/palette.stylex"
import { fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	error: {
		color: palette.reimu[600],
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		marginTop: px[8],
	},
})

export type ErrorMessageProps<T extends "span" | "li"> = Omit<
	JSX.HTMLAttributes<T>,
	"children"
> & {
	styles?: StyleXStyles
	children?: string
	as?: T
}

export function ErrorMessage<T extends "span" | "li" = "span">(
	props: ErrorMessageProps<T>,
): JSX.Element {
	const [local, others] = splitProps(props, ["styles"])

	return (
		<Show when={props.children}>
			{/** @ts-expect-error */}
			<Dynamic
				component={props.as ?? "span"}
				{...others}
				{...stylex.attrs(styles.error, local.styles)}
			>
				{props.children}
			</Dynamic>
		</Show>
	)
}
