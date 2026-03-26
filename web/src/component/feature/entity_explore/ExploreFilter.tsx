import { Select } from "~/component/atomic/form/select"

type ExploreFilterOption<T extends string> = {
	value: T
	label: string
}

type ExploreFilterProps<T extends string> = {
	label: string
	value: T | undefined
	defaultValue: T
	triggerClass?: string
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
		<div class="flex items-center gap-2">
			<span class="text-sm text-tertiary">{props.label}</span>
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
				<Select.Trigger class={props.triggerClass}>
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
		</div>
	)
}
