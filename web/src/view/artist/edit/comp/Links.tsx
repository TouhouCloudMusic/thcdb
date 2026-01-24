import { Field, FieldArray, insert, remove } from "@formisch/solid"
import { For } from "solid-js"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"

import { useArtistForm } from "../context"

export function ArtistFormLinks() {
	const { formStore } = useArtistForm()

	const addLink = () => {
		insert(formStore, { path: ["data", "links"], initialInput: "" })
	}

	const removeLinkAt = (index: number) => () => {
		remove(formStore, { path: ["data", "links"], at: index })
	}

	return (
		<div class="flex min-h-32 w-96 flex-col">
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">Links</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addLink}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>

			<FieldArray
				of={formStore}
				path={["data", "links"]}
			>
				{(fieldArray) => (
					<ul class="flex h-full flex-col gap-2">
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<>
									<li class="flex gap-2">
										<Field
											of={formStore}
											path={["data", "links", idx()]}
										>
											{(field) => (
												<InputField.Root class="grow">
													<InputField.Input
														{...field.props}
														id={field.path.join(".")}
														type="url"
														placeholder="Url"
														value={field.input ?? ""}
													/>
													<InputField.Error>
														{field.errors?.[0]}
													</InputField.Error>
												</InputField.Root>
											)}
										</Field>
										<Button
											variant="Tertiary"
											size="Sm"
											class="row-span-2 w-fit"
											onClick={removeLinkAt(idx())}
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
				)}
			</FieldArray>
		</div>
	)
}
