import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"

import { controlIconStyles } from "../controlSpacing"
import { Select } from "./select"
import { toolbarFieldStyles } from "./toolbarStyles"

export type ToolbarSelectOption<T extends string> = {
	value: T
	label: string
	itemLabel: string
}

const styles = stylex.create({
	trigger: { gridTemplateColumns: "minmax(0, 1fr) auto" },
	value: { paddingInlineStart: 0 },
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
				styles={[...toolbarFieldStyles, styles.trigger, props.styles]}
				aria-label={props.ariaLabel}
			>
				<Select.Value styles={styles.value}>
					{selectedOption()?.label}
				</Select.Value>
				<Select.Icon styles={controlIconStyles.slot} />
			</Select.Trigger>
			<Select.Content />
		</Select.Root>
	)
}
