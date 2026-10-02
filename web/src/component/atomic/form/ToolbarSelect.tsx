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
		<Select.Root<ToolbarSelectOption<T>>
			options={props.options}
			optionValue="value"
			optionTextValue="itemLabel"
			value={selectedOption()}
			placeholder={props.placeholder}
			onChange={(option) => {
				if (option === null) return
				props.onChange(option.value)
			}}
			itemComponent={(itemProps) => (
				<Select.Item item={itemProps.item}>
					{itemProps.item.rawValue.itemLabel}
				</Select.Item>
			)}
		>
			<Select.Trigger
				aria-label={props.ariaLabel}
				styles={[toolbarStyles.control, toolbarStyles.select, props.styles]}
			>
				<Select.Value<ToolbarSelectOption<T>>
					styles={toolbarStyles.selectValue}
				>
					{(state) => state.selectedOption().label}
				</Select.Value>
				<Select.Icon />
			</Select.Trigger>
			<Select.Portal>
				<Select.Content>
					<Select.Listbox />
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	)
}
