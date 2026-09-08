import {
	Field,
	FieldArray,
	getErrors,
	insert,
	remove,
	setInput,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Language, LocalizedName } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useLabelForm } from "../context"

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
		minHeight: px[128],
		flexDirection: "column",
		gap: px[8],
	},
	item: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
		gridTemplateRows: "auto auto",
		alignItems: "stretch",
		columnGap: px[8],
		rowGap: px[4],
	},
	removeControl: { height: "100%", alignSelf: "stretch" },
	removeButton: {
		display: "grid",
		height: "100%",
		width: "100%",
		placeItems: "center",
	},
})

type Props = {
	styles?: StyleXStyles
	initLocalizedNames?: LocalizedName[]
}

type LocalizedNameItemProps = {
	index: number
	language: Language | undefined
	onSelectLanguage: (lang: Language | null) => void
	onRemove: () => void
}

export function LabelLocalizedNamesField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useLabelForm()

	const [languages, setLanguages] = createStore<(Language | undefined)[]>(
		untrack(() =>
			(props.initLocalizedNames ?? []).map((item) => item.language),
		),
	)

	const addLocalizedName = () => {
		insert(formStore, {
			path: ["data", "localized_names"],
		})
		setLanguages(languages.length, undefined)
	}

	const removeLocalizedNameAt = (idx: number) => () => {
		remove(formStore, { path: ["data", "localized_names"], at: idx })
		setLanguages((list) => list.toSpliced(idx, 1))
	}

	const setLanguageAt = (idx: number) => (lang: Language | null) => {
		if (!lang) return

		setLanguages(idx, lang)
		setInput(formStore, {
			path: ["data", "localized_names", idx, "language_id"],
			input: lang.id,
		})
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
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
					<ul {...stylex.attrs(styles.list)}>
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<LocalizedNameItem
									index={idx()}
									language={languages[idx()]}
									onSelectLanguage={setLanguageAt(idx())}
									onRemove={removeLocalizedNameAt(idx())}
								/>
							)}
						</For>
					</ul>
				)}
			</FieldArray>
		</div>
	)
}

function LocalizedNameItem(props: LocalizedNameItemProps) {
	const { t } = useLingui()
	const { formStore } = useLabelForm()

	return (
		<li {...stylex.attrs(styles.item)}>
			<Field
				of={formStore}
				path={["data", "localized_names", props.index, "name"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Input
							{...field.props}
							placeholder={t`Name`}
							value={field.input ?? ""}
						/>
					</InputField.Root>
				)}
			</Field>
			<Field
				of={formStore}
				path={["data", "localized_names", props.index, "language_id"]}
			>
				{(field) => (
					<>
						<LanguageCombobox
							onChange={props.onSelectLanguage}
							value={props.language}
						/>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? undefined}
						/>
					</>
				)}
			</Field>
			<div {...stylex.attrs(styles.removeControl)}>
				<Button
					onClick={props.onRemove}
					appearance="ghost"
					tone="gray"
					size="sm"
					styles={styles.removeButton}
				>
					<Cross1Icon />
				</Button>
			</div>
			<ul>
				<FormComp.ErrorList
					errors={getErrors(formStore, {
						path: ["data", "localized_names", props.index, "name"],
					})}
				/>
			</ul>
			<ul>
				<FormComp.ErrorList
					errors={getErrors(formStore, {
						path: ["data", "localized_names", props.index, "language_id"],
					})}
				/>
			</ul>
		</li>
	)
}
