import { Select } from "~/component/atomic/form/select"
import { ExploreFilterField } from "~/component/feature/entity_explore/ExploreFilterField"

type ExploreFilterOption<T extends string> = {
	value: T
	label: string
}

type ExploreFilterProps<T extends string> = {
	label: string
	value: T | undefined
	defaultValue: T
	options: ExploreFilterOption<T>[]
	onChange: (value: T) => void
}

export function ExploreFilter<T extends string>(props: ExploreFilterProps<T>) {
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
				optionValue="value"
				optionTextValue="label"
				value={selectedOption()}
				onChange={(option) => {
					if (option === null) return
					props.onChange(option.value)
				}}
				itemComponent={(optionProps) => (
					<Select.Item item={optionProps.item}>
						{optionProps.item.rawValue.label}
					</Select.Item>
				)}
			>
				<Select.Trigger class="h-10 w-full">
					<Select.Value<ExploreFilterOption<T>>>
						{() => selectedOption()?.label ?? ""}
					</Select.Value>
					<Select.Icon />
				</Select.Trigger>
				<Select.Portal>
					<Select.Content>
						<Select.Listbox />
					</Select.Content>
				</Select.Portal>
			</Select.Root>
		</ExploreFilterField>
	)
}
