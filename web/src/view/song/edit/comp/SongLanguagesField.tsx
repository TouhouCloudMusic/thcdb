import {
	Field,
	FieldArray,
	getErrors,
	getInput,
	insert,
	remove,
	setInput,
} from "@formisch/solid"
import type { Language } from "@thc/api"
import { createMemo, For } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"

import type { SongFormStore } from "./types"

export function SongLanguagesField(props: {
	of: SongFormStore
	initLanguages?: Language[]
	class?: string
}) {
	let selectedLanguages = createMemo(() => {
		return getInput(props.of, { path: ["data", "languages"] })
	})

	const addLanguage = () => {
		insert(props.of, {
			path: ["data", "languages"],
		})
	}

	const removeLanguageAt = (index: number) => () => {
		remove(props.of, { path: ["data", "languages"], at: index })
	}

	const setLanguageAt = (index: number) => (lang: Language | null) => {
		if (!lang) return
		const alreadySelected = selectedLanguages().some(
			(entry) => entry === lang.id,
		)
		if (alreadySelected) return

		setInput(props.of, {
			path: ["data", "languages", index],
			input: lang.id,
		})
	}

	return (
		<div class={twMerge("flex flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">Languages</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addLanguage}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(props.of, { path: ["data", "languages"] })}
			/>
			<FieldArray
				of={props.of}
				path={["data", "languages"]}
			>
				{(fieldArray) => (
					<ul class="flex min-h-32 flex-col gap-2">
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<li class="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
									<Field
										of={props.of}
										path={["data", "languages", idx()]}
									>
										{(field) => (
											<>
												<LanguageCombobox
													onChange={setLanguageAt(idx())}
													filter={(lang) => {
														return !selectedLanguages().includes(lang.id)
													}}
												/>
												<input
													{...field.props}
													type="number"
													hidden
													value={field.input ?? undefined}
												/>
												<Button
													variant="Tertiary"
													class="aspect-square"
													onClick={removeLanguageAt(idx())}
												>
													<Cross1Icon class="mx-auto" />
												</Button>
												<ul>
													<FormComp.ErrorList errors={field.errors} />
												</ul>
											</>
										)}
									</Field>
								</li>
							)}
						</For>
					</ul>
				)}
			</FieldArray>
		</div>
	)
}
