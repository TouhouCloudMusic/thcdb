import * as M from "@modular-forms/solid"
import { For } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form/FieldArrayFallback"
import type { NewArtistCorrection } from "~/domain/artist/schema"

import { useArtistForm } from "../context"

export function ArtistFormTextAliases() {
	const { formStore } = useArtistForm()
	return (
		<M.FieldArray
			of={formStore}
			name="data.text_aliases"
		>
			{(fieldArray) => (
				<div class="flex min-h-32 w-96 flex-col">
					<div class="mb-4 flex place-content-between items-center gap-4">
						<FormComp.Label class="m-0">Text Aliases</FormComp.Label>
						<Button
							variant="Tertiary"
							class="h-max p-2"
							onClick={() => {
								M.insert(formStore, "data.text_aliases", {
									value: "", // Default for new text alias
								})
							}}
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
								<>
									<li class="flex gap-2">
										<M.Field
											of={formStore}
											name={`data.text_aliases.${idx()}`}
										>
											{(field, fieldProps) => (
												<InputField.Root class="grow">
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
										<Button
											variant="Tertiary"
											size="Sm"
											class="row-span-2 w-fit"
											onClick={() => {
												M.remove(formStore, "data.text_aliases", {
													at: idx(),
												})
											}}
										>
											<Cross1Icon />
										</Button>
									</li>
									{idx() < fieldArray.items.length - 1 && (
										<Divider horizontal />
									)}
								</>
							)}
						</For>
					</ul>
				</div>
			)}
		</M.FieldArray>
	)
}
