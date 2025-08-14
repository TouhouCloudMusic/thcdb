import * as M from "@modular-forms/solid"
import { useQuery } from "@tanstack/solid-query"
import { For } from "solid-js"
import { CheckIcon, Cross1Icon, PlusIcon } from "solid-radix-icons"

import type { Language } from "~/api"
import { LanguagesQuery } from "~/api"
import type { NewArtistCorrection } from "~/api/artist/schema"
import { Button } from "~/components/button"
import { Combobox } from "~/components/common/Combobox"
import { FormComp } from "~/components/common/form"
import { InputField } from "~/components/common/form/Input"
import { Divider } from "~/components/divider"

import { useArtistForm } from "../context"
import { FieldArrayFallback } from "./FieldArrayFallback"

export function ArtistFormLocalizedNames() {
	const { formStore } = useArtistForm()
	let langs = useQuery(() => LanguagesQuery.findAll())

	let insert = () =>
		M.insert(formStore, "data.localized_names", {
			// @ts-expect-error
			value: { language_id: undefined, name: "" },
		})
	let remove = (idx: number) =>
		M.remove(formStore, "data.localized_names", {
			at: idx,
		})

	return (
		<M.FieldArray
			of={formStore}
			name="data.localized_names"
		>
			{(fieldArray) => (
				<div class="flex min-h-32 w-96 flex-col">
					<div class="mb-4 flex place-content-between items-center gap-4">
						<FormComp.Label class="m-0">Localized Names</FormComp.Label>
						<Button
							variant="Tertiary"
							class="h-max p-2"
							onClick={insert}
						>
							<PlusIcon class="size-4" />
						</Button>
					</div>
					<ul class="flex h-full flex-col gap-2">
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<li class="grid grid-cols-[1fr_auto] grid-rows-2 gap-2">
									<M.Field
										of={formStore}
										name={`data.localized_names.${idx()}.name`}
									>
										{(field, fieldProps) => (
											<InputField.Root class="row-start-2">
												<InputField.Input
													{...fieldProps}
													id={field.name}
													placeholder="Name"
													value={field.value}
												/>
												<InputField.Error message={field.error} />
											</InputField.Root>
										)}
									</M.Field>

									<LanguageCombobox
										index={idx()}
										langs={langs.data!}
									/>
									<Button
										variant="Tertiary"
										size="Sm"
										class="row-span-2 w-fit"
										onClick={() => remove(idx())}
									>
										<Cross1Icon />
									</Button>
									{idx() < fieldArray.items.length - 1 && <Divider horizonal />}
								</li>
							)}
						</For>
					</ul>
				</div>
			)}
		</M.FieldArray>
	)
}

// oxlint-disable-next-line max-lines-per-function
function LanguageCombobox(props: { index: number; langs: Language[] }) {
	const { formStore } = useArtistForm()
	let onChange = (v: Language | null) => {
		if (v) {
			M.setValue(
				formStore,
				`data.localized_names.${props.index}.language_id`,
				v.id,
			)
		} else {
			M.reset(formStore, `data.localized_names.${props.index}.language_id`)
		}
	}

	return (
		<Combobox.Root
			placeholder="Select language"
			options={props.langs}
			optionValue="id"
			optionTextValue="name"
			optionLabel="name"
			onChange={onChange}
			itemComponent={(props) => (
				<Combobox.Item item={props.item}>
					<Combobox.ItemLabel>{props.item.rawValue.name}</Combobox.ItemLabel>
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
