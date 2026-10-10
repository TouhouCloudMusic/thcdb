import {
	useField,
	getInput,
	insert,
	remove,
	useFieldArray,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { FieldArrayFallback } from "~/component/form"
import { LanguageSelect } from "~/component/form/stateful/LanguageSelect"
import type { Language } from "~/hey-api"
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
})

const rowStyles = stylex.create({
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

function LanguageRow(props: { of: SongFormStore; index: number }) {
	const field = useField(
		() => props.of,
		() => ({
			path: ["data", "languages", props.index],
		}),
	)

	const isAvailableLanguage = (language: Language) =>
		!getInput(props.of, { path: ["data", "languages"] }).some(
			(selected, index) =>
				index !== props.index && selected?.id === language.id,
		)

	const selectLanguage = (language: Language | undefined) => {
		if (language !== undefined && !isAvailableLanguage(language)) return
		field.onInput(language)
	}

	const removeLanguage = () =>
		remove(props.of, {
			path: ["data", "languages"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.entry)}>
			<LanguageSelect
				value={field.input}
				onChange={selectLanguage}
				filter={isAvailableLanguage}
			/>
			<Button
				onClick={removeLanguage}
				appearance="ghost"
				tone="gray"
				styles={rowStyles.removeButton}
			>
				<Cross1Icon {...stylex.attrs(rowStyles.removeIcon)} />
			</Button>
			<ul>
				<FormComp.ErrorList errors={field.errors} />
			</ul>
		</li>
	)
}

export function SongLanguagesField(props: {
	of: SongFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const languages = useFieldArray(() => props.of, {
		path: ["data", "languages"],
	})

	const addLanguage = () => {
		insert(props.of, {
			path: languages.path,
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
			<FormComp.ErrorList errors={languages.errors} />
			<ul {...stylex.attrs(styles.entries)}>
				<For
					each={languages.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<LanguageRow
							of={props.of}
							index={index()}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}
