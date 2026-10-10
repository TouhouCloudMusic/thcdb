import { insert, remove, useField, useFieldArray } from "@formisch/solid"
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
})

const rowStyles = stylex.create({
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

function LocalizedNameRow(props: { index: number }) {
	const { t } = useLingui()
	const { formStore } = useLabelForm()

	const name = useField(formStore, () => ({
		path: ["data", "localized_names", props.index, "name"],
	}))
	const language = useField(formStore, () => ({
		path: ["data", "localized_names", props.index, "language"],
	}))

	const removeLocalizedNameAt = (index: number) => () =>
		remove(formStore, {
			path: ["data", "localized_names"],
			at: index,
		})

	return (
		<li {...stylex.attrs(rowStyles.item)}>
			<InputField.Root>
				<InputField.Input
					{...name.props}
					placeholder={t`Name`}
					value={name.input ?? ""}
				/>
				<InputField.Error>{name.errors?.[0]}</InputField.Error>
			</InputField.Root>
			<LanguageSelect
				onChange={language.onInput}
				value={language.input}
			/>
			<div {...stylex.attrs(rowStyles.removeControl)}>
				<Button
					onClick={removeLocalizedNameAt(props.index)}
					appearance="ghost"
					tone="gray"
					size="sm"
					styles={rowStyles.removeButton}
				>
					<Cross1Icon />
				</Button>
			</div>
			<ul>
				<FormComp.ErrorList errors={language.errors} />
			</ul>
		</li>
	)
}

type Props = {
	styles?: StyleXStyles
}

export function LabelLocalizedNamesField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useLabelForm()

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
			<ul {...stylex.attrs(styles.list)}>
				<For
					each={localizedNames.items}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => <LocalizedNameRow index={index()} />}
				</For>
			</ul>
		</div>
	)
}
