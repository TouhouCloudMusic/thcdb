import { twMerge } from "tailwind-merge"

import { Select } from "~/component/atomic/form/select"

export type CollectionToolbarSelectOption<T extends string> = {
	value: T
	label: string
	itemLabel: string
}

export const COLLECTION_TOOL_CONTROL_CLASS =
	"h-9 rounded-sm border-slate-400 text-sm outline-none outline-offset-0 transition-colors hover:border-slate-500 focus-visible:border-slate-500"

const COLLECTION_TOOL_SELECT_CLASS = twMerge(
	COLLECTION_TOOL_CONTROL_CLASS,
	"gap-1 pl-3 pr-2 font-normal text-primary sm:grid-cols-[auto_auto]",
)

export function CollectionToolbarSelect<T extends string>(props: {
	options: CollectionToolbarSelectOption<T>[]
	value: T
	placeholder: string
	ariaLabel: string
	class?: string
	onChange: (value: T) => void
}) {
	const selectedOption = () =>
		props.options.find((option) => option.value === props.value)

	return (
		<Select.Root<CollectionToolbarSelectOption<T>>
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
				class={twMerge(COLLECTION_TOOL_SELECT_CLASS, props.class)}
			>
				<Select.Value<CollectionToolbarSelectOption<T>> class="truncate">
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
