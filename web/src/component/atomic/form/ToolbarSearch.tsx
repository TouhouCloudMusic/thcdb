import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { MagnifyingGlassIcon } from "@thc/icons/radix"

import { colors, px } from "~/style/tokens.stylex"

import { inputStyles } from "../Input"
import { controlIconStyles } from "../controlSpacing"
import { toolbarFieldStyles } from "./toolbarStyles"

const styles = stylex.create({
	shell: { display: "flex", alignItems: "center" },
	input: {
		flex: "1 1 0%",
		minWidth: 0,
		padding: 0,
		borderWidth: 0,
		backgroundColor: "transparent",
		outlineStyle: "none",
		font: "inherit",
		color: { default: "inherit", "::placeholder": colors.textSecondary },
	},
	icon: { width: px[16], height: px[16], color: colors.textTertiary },
})

export function ToolbarSearch(props: {
	value: string
	placeholder: string
	ariaLabel: string
	styles?: StyleXStyles
	onInput: (value: string) => void
}) {
	return (
		<label
			{...stylex.attrs(
				inputStyles.like,
				...toolbarFieldStyles,
				styles.shell,
				props.styles,
			)}
		>
			<span
				{...stylex.attrs(controlIconStyles.slot)}
				aria-hidden="true"
			>
				<MagnifyingGlassIcon {...stylex.attrs(styles.icon)} />
			</span>
			<input
				type="search"
				value={props.value}
				placeholder={props.placeholder}
				aria-label={props.ariaLabel}
				onInput={(event) => props.onInput(event.currentTarget.value)}
				{...stylex.attrs(styles.input)}
			/>
		</label>
	)
}
