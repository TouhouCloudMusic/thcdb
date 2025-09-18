import { Field, FieldArray, insert, remove, setInput } from "@formisch/solid"
import { Trans } from "@lingui-solid/solid/macro"
import type { Label, SimpleLabel } from "@thc/api"
import { For, Show } from "solid-js"
import { createStore } from "solid-js/store"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LabelSearchDialog } from "~/component/form/SearchDialog"

import { LabelInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

// oxlint-disable-next-line max-lines-per-function
export function ReleaseCatalogNumbersField(props: {
	of: ReleaseFormStore
	initCatalogLabels?: (SimpleLabel | undefined)[]
	class?: string
}) {
	const [labels, setLabels] = createStore<(SimpleLabel | undefined)[]>([
		...(props.initCatalogLabels ?? []),
	])

	const addCatalogNumber = () => {
		insert(props.of, {
			path: ["data", "catalog_nums"],
			initialInput: { catalog_number: "", label_id: undefined },
		})
		setLabels(labels.length, undefined)
	}

	const removeCatalogNumberAt = (idx: number) => () => {
		remove(props.of, { path: ["data", "catalog_nums"], at: idx })
		setLabels((list) => list.toSpliced(idx, 1))
	}

	const setCatalogLabelAt = (idx: number) => (label: Label) => {
		setInput(props.of, {
			path: ["data", "catalog_nums", idx, "label_id"],
			input: label.id,
		})
		setLabels(idx, label)
	}

	return (
		<div class={twMerge("flex min-h-32 flex-col", props.class)}>
			<div class="mb-4 flex place-content-between items-center gap-4">
				<FormComp.Label class="m-0">
					<Trans>Catalog Numbers</Trans>
				</FormComp.Label>
				<Button
					variant="Tertiary"
					class="h-max p-2"
					onClick={addCatalogNumber}
				>
					<PlusIcon class="size-4" />
				</Button>
			</div>
			<ul class="flex h-full flex-col gap-2">
				<FieldArray
					of={props.of}
					path={["data", "catalog_nums"]}
				>
					{(fa) => (
						<For
							each={fa.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<li class="grid grid-cols-[repeat(2,minmax(0,1fr))_auto_auto] items-center gap-2">
									<Field
										of={props.of}
										path={["data", "catalog_nums", idx(), "catalog_number"]}
									>
										{(field) => (
											<InputField.Root>
												<InputField.Input
													{...field.props}
													placeholder="Catalog No."
													value={field.input}
												/>
												<InputField.Error>
													{field.errors ? field.errors[0] : undefined}
												</InputField.Error>
											</InputField.Root>
										)}
									</Field>

									<Field
										of={props.of}
										path={["data", "catalog_nums", idx(), "label_id"]}
									>
										{(field) => (
											<>
												<input
													{...field.props}
													type="number"
													hidden
													value={field.input ?? undefined}
												/>
												<div>
													<Show
														when={labels[idx()]}
														fallback={
															<span class="text-tertiary">
																<Trans>No label selected</Trans>
															</span>
														}
													>
														{(lbl) => <LabelInfo value={lbl()} />}
													</Show>
												</div>

												<LabelSearchDialog
													onSelect={setCatalogLabelAt(idx())}
													icon={<Pencil1Icon />}
												/>
											</>
										)}
									</Field>

									<Button
										variant="Tertiary"
										size="Sm"
										class="p-2"
										onClick={removeCatalogNumberAt(idx())}
									>
										<Cross1Icon />
									</Button>
								</li>
							)}
						</For>
					)}
				</FieldArray>
			</ul>
		</div>
	)
}
