import { useQuery } from "@tanstack/solid-query"
import type { Language } from "@thc/api"
import { LanguagesQuery } from "@thc/query"
import { CheckIcon } from "solid-radix-icons"

import { Combobox } from "~/component/atomic/Combobox"

// TODO: global singleton
const useLang = () => useQuery(LanguagesQuery.findAll)
let langs: ReturnType<typeof useLang>

export function LanguageCombobox(props: {
	onChange: (v: Language | null) => void
	placeholder?: string
	value?: Language
	filter?: (lang: Language) => boolean
}) {
	if (!langs) {
		langs = useLang()
	}

	return (
		<Combobox.Root
			placeholder={props.placeholder ?? "Select language"}
			options={
				// oxlint-disable-next-line no-nested-ternary
				langs.isSuccess
					? props.filter
						? langs.data.filter(props.filter)
						: langs.data
					: []
			}
			optionValue="id"
			optionTextValue="name"
			optionLabel="name"
			value={props.value}
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
