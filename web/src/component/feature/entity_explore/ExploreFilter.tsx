import * as stylex from "@stylexjs/stylex"

import { Select } from "~/component/atomic/form/select"
import { ExploreFilterField } from "~/component/feature/entity_explore/ExploreFilterField"
import { px } from "~/style/tokens.stylex"

const styles = stylex.create({
	trigger: { height: px[40], width: "100%" },
})

type ExploreFilterOption<T extends string | undefined> = {
	value: T
	label: string
}

type ExploreFilterProps<T extends string | undefined> = {
	label: string
	value: T | undefined
	defaultValue: T
	options: ExploreFilterOption<T>[]
	onChange: (value: T) => void
}

export function ExploreFilter<T extends string | undefined>(
	props: ExploreFilterProps<T>,
) {
	const selectedOption = () => {
		const option = props.options.find(
			(candidate) => candidate.value === props.value,
		)
		return (
			option
			?? props.options.find(
				(candidate) => candidate.value === props.defaultValue,
			)
		)
	}

	return (
		<ExploreFilterField label={props.label}>
			<Select.Root
				options={props.options}
				optionValue={(option) => option.value ?? "all"}
				optionTextValue="label"
				value={selectedOption()}
				onChange={(option) => {
					if (option === undefined) return
					props.onChange(option.value)
				}}
			>
				<Select.Trigger
					styles={styles.trigger}
					aria-label={props.label}
				/>
				<Select.Content />
			</Select.Root>
		</ExploreFilterField>
	)
}
