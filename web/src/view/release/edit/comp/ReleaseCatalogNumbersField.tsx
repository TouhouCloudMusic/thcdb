import { Field, FieldArray, insert, remove, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Label, SimpleLabel } from "@thc/api"
import { Cross1Icon, Pencil1Icon, PlusIcon } from "@thc/icons/radix"
import { For, Show, createMemo, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LabelSearchDialog } from "~/component/form/SearchDialog"
import { formStyles } from "~/style/primitives"
import { colors, px } from "~/style/tokens.stylex"

import { LabelInfo } from "./EntityInfo"
import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
	field: {
		display: "flex",
		minHeight: px[128],
		flexDirection: "column",
	},
	header: {
		marginBottom: px[16],
		display: "flex",
		placeContent: "space-between",
		alignItems: "center",
		gap: px[16],
	},
	label: { margin: "0rem" },
	addButton: { height: "max-content", padding: px[8] },
	icon: { width: px[16], height: px[16] },
	list: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[8],
	},
	item: {
		display: "grid",
		gridTemplateColumns: "repeat(2,minmax(0,1fr)) auto auto",
		alignItems: "center",
		gap: px[8],
	},
	placeholder: { color: colors.textTertiary },
	removeButton: { padding: px[8] },
})

export function ReleaseCatalogNumbersField(props: {
	of: ReleaseFormStore
	initCatalogLabels?: (SimpleLabel | undefined)[]
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	const formStore = createMemo(() => props.of)
	const [labels, setLabels] = createStore<(SimpleLabel | undefined)[]>(
		untrack(() => [...(props.initCatalogLabels ?? [])]),
	)

	const addCatalogNumber = () => {
		insert(formStore(), {
			path: ["data", "catalog_nums"],
			initialInput: { catalog_number: "", label_id: undefined },
		})
		setLabels(labels.length, undefined)
	}

	const removeCatalogNumberAt = (idx: number) => {
		remove(formStore(), { path: ["data", "catalog_nums"], at: idx })
		setLabels((list) => list.toSpliced(idx, 1))
	}

	const setCatalogLabelAt = (idx: number, label: Label) => {
		setInput(formStore(), {
			path: ["data", "catalog_nums", idx, "label_id"],
			input: label.id,
		})
		setLabels(idx, label)
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Catalog Numbers`}</label>
				<Button
					onClick={addCatalogNumber}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>
			<ul {...stylex.attrs(styles.list)}>
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
								<li {...stylex.attrs(styles.item)}>
									<Field
										of={props.of}
										path={["data", "catalog_nums", idx(), "catalog_number"]}
									>
										{(field) => (
											<InputField.Root>
												<InputField.Input
													{...field.props}
													placeholder={t`Catalog No.`}
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
															<span {...stylex.attrs(styles.placeholder)}>
																No label selected
															</span>
														}
													>
														{(lbl) => <LabelInfo value={lbl()} />}
													</Show>
												</div>

												<LabelSearchDialog
													onSelect={(label) => setCatalogLabelAt(idx(), label)}
													icon={<Pencil1Icon />}
												/>
											</>
										)}
									</Field>

									<Button
										onClick={() => removeCatalogNumberAt(idx())}
										appearance="ghost"
										tone="gray"
										size="sm"
										styles={styles.removeButton}
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
