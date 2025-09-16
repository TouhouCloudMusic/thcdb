import { useQuery } from "@tanstack/solid-query"
import type { Language } from "@thc/api"
import { LanguagesQuery } from "@thc/query"
import { CheckIcon } from "solid-radix-icons"

import { Combobox } from "~/component/atomic/Combobox"

export function LanguageCombobox(props: {
	onChange: (v: Language | null) => void
	placeholder?: string
}) {
	const langs = useQuery(() => LanguagesQuery.findAll())

	return (
		<Combobox.Root
			placeholder={props.placeholder ?? "Select language"}
			options={langs.isSuccess ? langs.data : []}
			optionValue="id"
			optionTextValue="name"
			optionLabel="name"
			onChange={props.onChange}
			itemComponent={(itemProps) => (
				<Combobox.Item item={itemProps.item}>
					<Combobox.ItemLabel>
						{itemProps.item.rawValue.name}
					</Combobox.ItemLabel>
					<Combobox.ItemIndicator>
						<CheckIcon class="text-primary" />
					</Combobox.ItemIndicator>
				</Combobox.Item>
			)}
		>
			<Combobox.Control>
				<Combobox.Input />
				<Combobox.Trigger>
					<Combobox.Icon />
				</Combobox.Trigger>
			</Combobox.Control>

			<Combobox.Portal>
				<Combobox.Content>
					<Combobox.Listbox />
				</Combobox.Content>
			</Combobox.Portal>
		</Combobox.Root>
	)
}
