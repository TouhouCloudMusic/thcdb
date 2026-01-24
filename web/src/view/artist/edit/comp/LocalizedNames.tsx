import {
	Field,
	FieldArray,
	insert,
	remove,
	reset,
	setInput,
} from "@formisch/solid"
import type { Language } from "@thc/api"
import { For } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"

import { useArtistForm } from "../context"

export function ArtistFormLocalizedNames() {
	const { formStore } = useArtistForm()

	const addLocalizedName = () => {
		insert(formStore, {
			path: ["data", "localized_names"],
			initialInput: { language_id: undefined, name: "" },
		})
	}

	const removeLocalizedNameAt = (index: number) => () => {
		remove(formStore, { path: ["data", "localized_names"], at: index })
	}

	return (
		<div class="flex min-h-32 w-96 flex-col">
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">Localized Names</FormComp.Label>
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
					<ul class="flex h-full flex-col gap-2">
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<li class="grid grid-cols-[1fr_auto] grid-rows-2 gap-2">
									<Field
										of={formStore}
										path={["data", "localized_names", idx(), "name"]}
									>
										{(field) => (
											<InputField.Root class="row-start-2">
												<InputField.Input
													{...field.props}
													id={field.path.join(".")}
													placeholder="Name"
													value={field.input ?? ""}
												/>
												<InputField.Error>{field.errors?.[0]}</InputField.Error>
											</InputField.Root>
										)}
									</Field>

									{/* TODO: form init value */}
									<LanguageCombobox onChange={createOnLangChange(idx())} />
									<Button
										variant="Tertiary"
										size="Sm"
										class="row-span-2 w-fit"
										onClick={removeLocalizedNameAt(idx())}
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
				)}
			</FieldArray>
		</div>
	)
}

function createOnLangChange(index: number) {
	const { formStore } = useArtistForm()
	const onChange = (v: Language | null) => {
		if (v) {
			setInput(formStore, {
				path: ["data", "localized_names", index, "language_id"],
				input: v.id,
			})
		} else {
			reset(formStore, {
				path: ["data", "localized_names", index, "language_id"],
			})
		}
	}
	return onChange
}
