import * as M from "@modular-forms/solid"
import { For } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import type { NewArtistCorrection } from "~/domain/artist/schema"

import { useArtistForm } from "../context"
import { FieldArrayFallback } from "./FieldArrayFallback"

export function ArtistFormLinks() {
	const { formStore } = useArtistForm()
	return (
		<M.FieldArray
			of={formStore}
			name="data.links"
		>
			{(fieldArray) => (
				<div class="flex min-h-32 w-96 flex-col">
					<div class="mb-4 flex place-content-between items-center gap-4">
						<FormComp.Label class="m-0">Links</FormComp.Label>
						<Button
							variant="Tertiary"
							class="h-max p-2"
							onClick={() => {
								M.insert(formStore, "data.links", {
									value: "", // Default value for a new link
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
											name={`data.links.${idx()}`}
										>
											{(field, fieldProps) => (
												<InputField.Root class="grow">
													<InputField.Input
														{...fieldProps}
														id={field.name}
														type="url"
														placeholder="Url"
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
												M.remove(formStore, "data.links", {
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
