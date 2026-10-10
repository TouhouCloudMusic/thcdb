import { insert, remove, useField, useFieldArray } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"
import { LanguageSelect } from "~/component/form/stateful/LanguageSelect"
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
})

const rowStyles = stylex.create({
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

function LocalizedNameRow(props: { index: number }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const name = useField(formStore, () => ({
		path: ["data", "localized_names", props.index, "name"],
	}))
	const language = useField(formStore, () => ({
		path: ["data", "localized_names", props.index, "language"],
	}))

	const removeLocalizedName = () =>
		remove(formStore, {
			path: ["data", "localized_names"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.entry)}>
			<InputField.Root styles={[rowStyles.nameField]}>
				<InputField.Input
					{...name.props}
					id={name.path.join(".")}
					placeholder={t`Name`}
					value={name.input ?? ""}
				/>
				<InputField.Error>{name.errors?.[0]}</InputField.Error>
			</InputField.Root>

			<LanguageSelect
				value={language.input}
				onChange={language.onInput}
			/>
			<Button
				onClick={removeLocalizedName}
				appearance="ghost"
				tone="gray"
				size="sm"
				styles={rowStyles.removeButton}
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}

export function ArtistFormLocalizedNames(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const localizedNames = useFieldArray(formStore, {
		path: ["data", "localized_names"],
	})

	const addLocalizedName = () => {
		insert(formStore, {
			path: localizedNames.path,
		})
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

			<ul {...stylex.attrs(styles.entries)}>
				<Intersperse
					of={localizedNames.items}
					with={
						<li
							aria-hidden="true"
							{...stylex.attrs(dividerStyles.horizontal)}
						></li>
					}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => <LocalizedNameRow index={index()} />}
				</Intersperse>
			</ul>
		</div>
	)
}
