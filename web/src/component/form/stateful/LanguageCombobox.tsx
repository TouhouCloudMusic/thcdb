import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { Language } from "@thc/api"
import { LanguagesQuery } from "@thc/query"
import { CheckIcon } from "solid-radix-icons"

import { Combobox } from "~/component/atomic/Combobox"

// TODO: global singleton
const useLang = () => useQuery(LanguagesQuery.findAll)
let langs: ReturnType<typeof useLang> | undefined

function useLangSingleton() {
	const query = langs
	if (query !== undefined) return query

	const newQuery = useLang()
	langs = newQuery
	return newQuery
}

export function LanguageCombobox(props: {
	onChange: (v: Language | null) => void
	placeholder?: string
	value?: Language
	filter?: (lang: Language) => boolean
}) {
	const { t } = useLingui()
	const langQuery = useLangSingleton()

	return (
		<Combobox.Root
			placeholder={props.placeholder ?? t`Select language`}
			options={
				langQuery.isSuccess
					? props.filter
						? langQuery.data.filter(props.filter)
						: langQuery.data
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
