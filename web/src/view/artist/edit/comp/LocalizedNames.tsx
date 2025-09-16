import * as M from "@modular-forms/solid"
import type { Language } from "@thc/api"
import { For } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form/FieldArrayFallback"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"
import type { NewArtistCorrection } from "~/domain/artist/schema"

import { useArtistForm } from "../context"

export function ArtistFormLocalizedNames() {
	const { formStore } = useArtistForm()

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
												<InputField.Error>{field.error}</InputField.Error>
											</InputField.Root>
										)}
									</M.Field>

									<LanguageCombobox onChange={createOnLangChange(idx())} />
									<Button
										variant="Tertiary"
										size="Sm"
										class="row-span-2 w-fit"
										onClick={() => remove(idx())}
									>
										<Cross1Icon />
									</Button>
									{idx() < fieldArray.items.length - 1 && (
										<Divider horizontal />
									)}
								</li>
							)}
						</For>
					</ul>
				</div>
			)}
		</M.FieldArray>
	)
}

function createOnLangChange(index: number) {
	const { formStore } = useArtistForm()
	let onChange = (v: Language | null) => {
		if (v) {
			M.setValue(formStore, `data.localized_names.${index}.language_id`, v.id)
		} else {
			M.reset(formStore, `data.localized_names.${index}.language_id`)
		}
	}
	return onChange
}
