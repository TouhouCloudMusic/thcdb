import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"

import { palette } from "~/style/color/palette.stylex"
import { colors, fontSizes, px } from "~/style/tokens.stylex"

import { Select } from "./select"

export type ToolbarSelectOption<T extends string> = {
	value: T
	label: string
	itemLabel: string
}

export const toolbarStyles = stylex.create({
	control: {
		height: px[36],
		borderColor: {
			default: palette.slate[400],
			":hover": { default: null, "@media (hover: hover)": palette.slate[500] },
			":focus-visible": palette.slate[500],
		},
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
		outlineStyle: "none",
		outlineOffset: 0,
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
	},
	select: {
		gridTemplateColumns: `minmax(0, 1fr) ${px[16]}`,
		columnGap: px[8],
		paddingInlineStart: px[12],
		paddingInlineEnd: px[12],
		fontWeight: 400,
		color: colors.textPrimary,
	},
	selectValue: { paddingInlineStart: 0 },
})

export function ToolbarSelect<T extends string>(props: {
	options: ToolbarSelectOption<T>[]
	value: T
	placeholder: string
	ariaLabel: string
	styles?: StyleXStyles
	onChange: (value: T) => void
}) {
	const selectedOption = () =>
		props.options.find((option) => option.value === props.value)

	return (
		<Select.Root
			options={props.options}
			optionValue="value"
			optionTextValue="itemLabel"
			value={selectedOption()}
			placeholder={props.placeholder}
			onChange={(option) => {
				if (option === undefined) return
				props.onChange(option.value)
			}}
		>
			<Select.Trigger
				styles={[toolbarStyles.control, toolbarStyles.select, props.styles]}
				aria-label={props.ariaLabel}
			>
				<Select.Value styles={toolbarStyles.selectValue}>
					{selectedOption()?.label}
				</Select.Value>
				<Select.Icon />
			</Select.Trigger>
			<Select.Content />
		</Select.Root>
	)
}
