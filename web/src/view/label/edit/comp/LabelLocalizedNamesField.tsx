import {
	Field,
	FieldArray,
	getErrors,
	insert,
	remove,
	setInput,
} from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { Language, LocalizedName } from "@thc/api"
import { For } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"

import { useLabelForm } from "../context"

type Props = {
	class?: string
	initLocalizedNames?: LocalizedName[]
}

type LocalizedNameItemProps = {
	index: number
	language: Language | undefined
	onSelectLanguage: (lang: Language | null) => void
	onRemove: () => void
}

export function LabelLocalizedNamesField(props: Props) {
	const { formStore } = useLabelForm()

	const [languages, setLanguages] = createStore<(Language | undefined)[]>(
		(props.initLocalizedNames ?? []).map((item) => item.language),
	)

	const addLocalizedName = () => {
		insert(formStore, {
			path: ["data", "localized_names"],
		})
		setLanguages(languages.length, undefined)
	}

	const removeLocalizedNameAt = (idx: number) => () => {
		remove(formStore, { path: ["data", "localized_names"], at: idx })
		setLanguages((list) => list.toSpliced(idx, 1))
	}

	const setLanguageAt = (idx: number) => (lang: Language | null) => {
		if (!lang) return

		setLanguages(idx, lang)
		setInput(formStore, {
			path: ["data", "localized_names", idx, "language_id"],
			input: lang.id,
		})
	}

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">
					<Trans>Localized Names</Trans>
				</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addLocalizedName}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<FieldArray
				of={formStore}
				path={["data", "localized_names"]}
			>
				{(fieldArray) => (
					<ul class="flex min-h-32 flex-col gap-2">
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<LocalizedNameItem
									index={idx()}
									language={languages[idx()]}
									onSelectLanguage={setLanguageAt(idx())}
									onRemove={removeLocalizedNameAt(idx())}
								/>
							)}
						</For>
					</ul>
				)}
			</FieldArray>
		</div>
	)
}

function LocalizedNameItem(props: LocalizedNameItemProps) {
	const { formStore } = useLabelForm()

	return (
		<li class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] grid-rows-[auto_auto] items-stretch gap-x-2 gap-y-1">
			<Field
				of={formStore}
				path={["data", "localized_names", props.index, "name"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Input
							{...field.props}
							placeholder="Name"
							value={field.input ?? ""}
						/>
					</InputField.Root>
				)}
			</Field>
			<Field
				of={formStore}
				path={["data", "localized_names", props.index, "language_id"]}
			>
				{(field) => (
					<>
						<LanguageCombobox
							onChange={props.onSelectLanguage}
							value={props.language}
						/>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? undefined}
						/>
					</>
				)}
			</Field>
			<div class="h-full self-stretch">
				<Button
					variant="Tertiary"
					size="Sm"
					onClick={props.onRemove}
					class="grid h-full w-full place-items-center"
				>
					<Cross1Icon />
				</Button>
			</div>
			<ul>
				<FormComp.ErrorList
					errors={getErrors(formStore, {
						path: ["data", "localized_names", props.index, "name"],
					})}
				/>
			</ul>
			<ul>
				<FormComp.ErrorList
					errors={getErrors(formStore, {
						path: ["data", "localized_names", props.index, "language_id"],
					})}
				/>
			</ul>
		</li>
	)
}
