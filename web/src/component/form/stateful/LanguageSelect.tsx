import { useComboboxContext } from "@kobalte/core/combobox"
import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { CheckIcon } from "@thc/icons/radix"
import { createMemo, Show } from "solid-js"

import { Combobox } from "~/component/atomic/Combobox"
import type { Language } from "~/hey-api"
import { languageListQueryOptions } from "~/state/language"

type Props = {
	onChange: (value: Language | undefined) => void
	placeholder?: string
	value?: Language
	filter?: (language: Language) => boolean
}

function LanguageSelectControl(props: {
	value?: Language
	onChange: (value: Language | undefined) => void
}) {
	const combobox = useComboboxContext()
	const restoreSelected = () => {
		if (!combobox.isOpen()) {
			combobox.setInputValue(props.value?.name ?? "")
		}
	}

	return (
		<Combobox.Control
			onKeyDown={(event) => {
				if (event.key === "Escape") {
					restoreSelected()
				}
			}}
			onClick={(event) => {
				if (combobox.triggerRef()?.contains(event.target)) {
					restoreSelected()
				}
			}}
		>
			<Combobox.Input
				onKeyDown={(event) => {
					if (event.key === "Enter" && event.currentTarget.value === "") {
						event.preventDefault()
						combobox.close()
						props.onChange(undefined)
					}
				}}
			/>
			<Combobox.Trigger>
				<Combobox.Icon />
			</Combobox.Trigger>
		</Combobox.Control>
	)
}

export function LanguageSelect(props: Props) {
	const { t } = useLingui()

	const languages = useQuery(languageListQueryOptions)

	const options = createMemo(() => {
		const selected = props.value

		const catalog = languages.isPending ? [] : (languages.data?.data ?? [])
		const candidates = catalog.filter(
			(language) =>
				language.id === selected?.id || !props.filter || props.filter(language),
		)

		if (selected) {
			const index = candidates.findIndex(
				(language) => language.id === selected.id,
			)

			if (index === -1) candidates.push(selected)
			else candidates[index] = selected
		}

		return candidates
	})

	return (
		<Combobox.Root
			placeholder={props.placeholder ?? t`Select language`}
			options={options()}
			allowsEmptyCollection={languages.isPending}
			optionValue="id"
			optionTextValue="name"
			optionLabel="name"
			value={props.value ?? null}
			onChange={(language) => props.onChange(language ?? undefined)}
			itemComponent={(itemProps) => (
				<Combobox.Item item={itemProps.item}>
					<Combobox.ItemLabel>
						{itemProps.item.rawValue.name}
					</Combobox.ItemLabel>
					<Combobox.ItemIndicator>
						<CheckIcon />
					</Combobox.ItemIndicator>
				</Combobox.Item>
			)}
		>
			<LanguageSelectControl
				value={props.value}
				onChange={props.onChange}
			/>

			<Combobox.Portal>
				<Combobox.Content>
					<Show when={languages.isPending}>
						<output>{t`Loading...`}</output>
					</Show>
					<Combobox.Listbox aria-busy={languages.isPending} />
				</Combobox.Content>
			</Combobox.Portal>
		</Combobox.Root>
	)
}
