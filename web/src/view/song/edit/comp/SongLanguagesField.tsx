import {
	Field,
	FieldArray,
	getErrors,
	getInput,
	insert,
	remove,
	setInput,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Language } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { createMemo, For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import type { SongFormStore } from "./types"

const styles = stylex.create({
	column: {
		display: "flex",
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
		gridTemplateColumns: "minmax(0,1fr) auto",
		gap: px[8],
	},
	removeButton: {
		aspectRatio: "1 / 1",
	},
	removeIcon: {
		marginInline: "auto",
	},
})

export function SongLanguagesField(props: {
	of: SongFormStore
	initLanguages?: Language[]
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	const selectedLanguages = createMemo(() => {
		return getInput(props.of, { path: ["data", "languages"] })
	})
	const selectedLanguageIds = createMemo(() => new Set(selectedLanguages()))
	const languageFilter = createMemo(() => {
		const ids = selectedLanguageIds()
		return (lang: Language) => !ids.has(lang.id)
	})

	const addLanguage = () => {
		insert(props.of, {
			path: ["data", "languages"],
		})
	}

	const removeLanguageAt = (index: number) => {
		remove(props.of, { path: ["data", "languages"], at: index })
	}

	const setLanguageAt = (index: number, lang: Language | null) => {
		if (!lang) return
		const alreadySelected = selectedLanguageIds().has(lang.id)
		if (alreadySelected) return

		setInput(props.of, {
			path: ["data", "languages", index],
			input: lang.id,
		})
	}

	return (
		<div {...stylex.attrs(styles.column, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Languages`}</label>
				<Button
					onClick={addLanguage}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
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
					<ul {...stylex.attrs(styles.entries)}>
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<li {...stylex.attrs(styles.entry)}>
									<Field
										of={props.of}
										path={["data", "languages", idx()]}
									>
										{(field) => (
											<>
												<LanguageCombobox
													onChange={(lang) => setLanguageAt(idx(), lang)}
													filter={languageFilter()}
												/>
												<input
													{...field.props}
													type="number"
													hidden
													value={field.input ?? undefined}
												/>
												<Button
													onClick={() => removeLanguageAt(idx())}
													appearance="ghost"
													tone="gray"
													styles={styles.removeButton}
												>
													<Cross1Icon {...stylex.attrs(styles.removeIcon)} />
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
