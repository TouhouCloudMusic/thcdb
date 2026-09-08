import {
	Field,
	FieldArray,
	insert,
	remove,
	reset,
	setInput,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { Language } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"
import { dividerStyles, formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useArtistForm } from "../context"

const styles = stylex.create({
	field: {
		display: "flex",
		minHeight: px[128],
		width: px[384],
		flexDirection: "column",
	},
	fieldHeader: {
		marginBottom: px[16],
		display: "flex",
		placeContent: "space-between",
		alignItems: "center",
		gap: px[16],
	},
	label: {
		margin: 0,
	},
	addButton: {
		height: "max-content",
		padding: px[8],
	},
	icon: {
		width: px[16],
		height: px[16],
	},
	entries: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[8],
	},
	entry: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		gridTemplateRows: "repeat(2, minmax(0, 1fr))",
		gap: px[8],
	},
	nameField: {
		gridRowStart: "2",
	},
	removeButton: {
		gridRow: "span 2 / span 2",
		width: "fit-content",
	},
})

export function ArtistFormLocalizedNames(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
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
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Localized Names`}</label>
				<Button
					onClick={addLocalizedName}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>

			<FieldArray
				of={formStore}
				path={["data", "localized_names"]}
			>
				{(fieldArray) => (
					<ul {...stylex.attrs(styles.entries)}>
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<li {...stylex.attrs(styles.entry)}>
									<Field
										of={formStore}
										path={["data", "localized_names", idx(), "name"]}
									>
										{(field) => (
											<InputField.Root styles={[styles.nameField]}>
												<InputField.Input
													{...field.props}
													id={field.path.join(".")}
													placeholder={t`Name`}
													value={field.input ?? ""}
												/>
												<InputField.Error>{field.errors?.[0]}</InputField.Error>
											</InputField.Root>
										)}
									</Field>

									{/* TODO: form init value */}
									<LanguageCombobox onChange={createOnLangChange(idx())} />
									<Button
										onClick={removeLocalizedNameAt(idx())}
										appearance="ghost"
										tone="gray"
										size="sm"
										styles={styles.removeButton}
									>
										<Cross1Icon />
									</Button>
									{idx() < fieldArray.items.length - 1 && (
										<span {...stylex.attrs(dividerStyles.horizontal)}></span>
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
