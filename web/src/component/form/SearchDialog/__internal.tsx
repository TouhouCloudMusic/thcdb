import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { MagnifyingGlassIcon } from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { splitProps } from "solid-js"

import { Dialog } from "~/component/dialog"
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

export { Root } from "~/component/dialog/__internal"
export type { RootProps } from "~/component/dialog/__internal"

const styles = stylex.create({
	label: {
		fontSize: fontSizes["3xl"],
		lineHeight: lineHeights["3xl"],
		fontWeight: 200,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	input: {
		paddingLeft: px[28],
		paddingBlock: px[4],
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderColor: {
			default: palette.slate[400],
			":hover": { default: null, "@media (hover: hover)": palette.reimu[600] },
			":focus": palette.reimu[600],
		},
		fontWeight: { default: null, "::placeholder": 300 },
		color: { default: null, "::placeholder": colors.textTertiary },
		outlineStyle: "none",
		letterSpacing: "-0.05em",
		transitionProperty: "all",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	inputRoot: { position: "relative" },
	inputIcon: {
		position: "absolute",
		zIndex: 10,
		marginInline: "auto",
		height: px[16],
		width: px[32],
		alignSelf: "center",
		color: colors.textTertiary,
	},
	content: {
		display: "flex",
		minHeight: px[512],
		flexDirection: "column",
		height: px[768],
		width: px[512],
		maxWidth: "90vw",
		borderRadius: radius.sm,
		padding: px[24],
	},
})

export const searchDialogStyles = stylex.create({
	list: {
		overflow: "auto",
		borderBlockWidth: { default: null, ":has(*:first-child)": 1 },
		borderBlockStyle: "solid",
		borderColor: palette.slate[300],
		marginBottom: px[16],
	},
	item: {
		position: "relative",
		isolation: "isolate",
		borderColor: palette.slate[300],
		padding: px[16],
		textAlign: "left",
		transitionProperty: "all",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		borderTopWidth: { default: null, ":not(:first-child)": 1 },
		borderTopStyle: "solid",
		borderBottomWidth: { default: null, ":last-child": 1 },
		borderBottomStyle: "solid",
		backgroundColor: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "#f6f7f8" },
			":active": "#f0f1f2",
		},
	},
	indicator: {
		position: "absolute",
		top: 0,
		left: 0,
		zIndex: 20,
		height: "100%",
		width: "1px",
		transformOrigin: "left",
		scale: {
			default: "1 0",
			"@media (hover: hover)": { [stylex.when.ancestor(":hover")]: "1 1" },
		},
		transform: "translateZ(0)",
		backgroundColor: "#ef5d5d",
		transitionProperty: "all",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
})

export type LabelProps = {
	children: JSX.Element
	styles?: StyleXStyles
}

export function Label(props: LabelProps) {
	return (
		<Dialog.Title styles={[styles.label, props.styles]}>
			{props.children}
		</Dialog.Title>
	)
}

export type InputProps = Omit<
	JSX.InputHTMLAttributes<HTMLInputElement>,
	"class"
> & { styles?: StyleXStyles }

export function Input(props: InputProps) {
	const [local, rest] = splitProps(props, ["styles", "style"])
	return (
		<div {...stylex.attrs(styles.inputRoot)}>
			<MagnifyingGlassIcon {...stylex.attrs(styles.inputIcon)} />
			<input
				{...rest}
				{...stylex.attrs(styles.input, local.styles)}
				style={local.style}
			/>
		</div>
	)
}

export function Content(props: Dialog.ContentProps) {
	const [local, rest] = splitProps(props, ["styles"])
	return (
		<Dialog.Portal>
			<Dialog.Overlay />
			<Dialog.Content
				{...rest}
				styles={[styles.content, local.styles]}
			/>
		</Dialog.Portal>
	)
}
