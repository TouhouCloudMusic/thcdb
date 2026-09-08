import {
	Field,
	FieldArray,
	insert,
	remove,
	setInput,
	getErrors,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Language, LocalizedTitle } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For, createMemo, untrack } from "solid-js"
import { createStore } from "solid-js/store"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import type { SongFormStore } from "./types"

const styles = stylex.create({
	field: {
		display: "flex",
		minHeight: px[128],
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
		minHeight: px[128],
		flexDirection: "column",
		gap: px[8],
	},
	entry: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
		gridTemplateRows: "auto auto",
		alignItems: "stretch",
		columnGap: px[8],
		rowGap: px[4],
	},
	removeControl: {
		height: "100%",
		alignSelf: "stretch",
	},
	removeButton: {
		display: "grid",
		height: "100%",
		width: "100%",
		placeItems: "center",
	},
})

export function SongLocalizedTitlesField(props: {
	of: SongFormStore
	initLocalizedTitles?: LocalizedTitle[]
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	const formStore = createMemo(() => props.of)
	const [languages, setLanguages] = createStore<(Language | undefined)[]>(
		untrack(() =>
			(props.initLocalizedTitles ?? []).map((item) => item.language),
		),
	)

	const addLocalizedTitle = () => {
		insert(formStore(), {
			path: ["data", "localized_titles"],
		})
		setLanguages(languages.length, undefined)
	}

	const removeLocalizedTitleAt = (index: number) => {
		remove(formStore(), { path: ["data", "localized_titles"], at: index })
		setLanguages((list) => list.toSpliced(index, 1))
	}

	const setLanguageAt = (index: number, lang: Language | null) => {
		if (!lang) return

		setLanguages(index, lang)
		setInput(formStore(), {
			path: ["data", "localized_titles", index, "language_id"],
			input: lang.id,
		})
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Localized Titles`}</label>
				<Button
					onClick={addLocalizedTitle}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>
			<FieldArray
				of={props.of}
				path={["data", "localized_titles"]}
			>
				{(fa) => (
					<ul {...stylex.attrs(styles.entries)}>
						<For
							each={fa.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<LocalizedTitleItem
									of={props.of}
									index={idx()}
									language={languages[idx()]}
									onSelectLanguage={(lang) => setLanguageAt(idx(), lang)}
									onRemove={() => removeLocalizedTitleAt(idx())}
								/>
							)}
						</For>
					</ul>
				)}
			</FieldArray>
		</div>
	)
}

function LocalizedTitleItem(props: {
	of: SongFormStore
	index: number
	language: Language | undefined
	onSelectLanguage: (lang: Language | null) => void
	onRemove: () => void
}) {
	const { t } = useLingui()
	return (
		<li {...stylex.attrs(styles.entry)}>
			<Field
				of={props.of}
				path={["data", "localized_titles", props.index, "name"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Input
							{...field.props}
							placeholder={t`Title`}
							value={field.input}
						/>
					</InputField.Root>
				)}
			</Field>
			<Field
				of={props.of}
				path={["data", "localized_titles", props.index, "language_id"]}
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
					errors={getErrors(props.of, {
						path: ["data", "localized_titles", props.index, "name"],
					})}
				/>
			</ul>
			<ul>
				<FormComp.ErrorList
					errors={getErrors(props.of, {
						path: ["data", "localized_titles", props.index, "language_id"],
					})}
				/>
			</ul>
		</li>
	)
}
