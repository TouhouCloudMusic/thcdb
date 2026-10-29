import { useFieldArray, useField, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageSelect } from "~/component/form/stateful/LanguageSelect"
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
})

const rowStyles = stylex.create({
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

function LocalizedTitleRow(props: { of: SongFormStore; index: number }) {
	const { t } = useLingui()

	const title = useField(
		() => props.of,
		() => ({
			path: ["data", "localized_titles", props.index, "name"],
		}),
	)

	const language = useField(
		() => props.of,
		() => ({
			path: ["data", "localized_titles", props.index, "language"],
		}),
	)

	const removeTitle = () =>
		remove(props.of, {
			path: ["data", "localized_titles"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.entry)}>
			<InputField.Root>
				<InputField.Input
					{...title.props}
					placeholder={t`Title`}
					value={title.input}
				/>
			</InputField.Root>
			<LanguageSelect
				onChange={language.onInput}
				value={language.input}
			/>
			<div {...stylex.attrs(rowStyles.removeControl)}>
				<Button
					onClick={removeTitle}
					appearance="ghost"
					tone="gray"
					size="sm"
					styles={rowStyles.removeButton}
				>
					<Cross1Icon />
				</Button>
			</div>
			<ul>
				<FormComp.ErrorList errors={title.errors} />
			</ul>
			<ul>
				<FormComp.ErrorList errors={language.errors} />
			</ul>
		</li>
	)
}

export function SongLocalizedTitlesField(props: {
	of: SongFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const localizedTitles = useFieldArray(() => props.of, {
		path: ["data", "localized_titles"],
	})

	const addLocalizedTitle = () => {
		insert(props.of, {
			path: localizedTitles.path,
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
			<ul {...stylex.attrs(styles.entries)}>
				<For
					each={localizedTitles.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => (
						<LocalizedTitleRow
							of={props.of}
							index={index()}
						/>
					)}
				</For>
			</ul>
		</div>
	)
}
