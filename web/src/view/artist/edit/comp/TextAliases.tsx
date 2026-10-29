import { insert, remove, useField, useFieldArray } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"
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
	actions: {
		display: "flex",
		gap: px[8],
	},
	input: {
		flexGrow: 1,
	},
	removeButton: {
		gridRow: "span 2 / span 2",
		width: "fit-content",
	},
})

function TextAliasRow(props: { index: number }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const field = useField(formStore, () => ({
		path: ["data", "text_aliases", props.index],
	}))
	const removeTextAlias = () =>
		remove(formStore, {
			path: ["data", "text_aliases"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(rowStyles.actions)}>
			<InputField.Root styles={[rowStyles.input]}>
				<InputField.Input
					{...field.props}
					id={field.path.join(".")}
					placeholder={t`Name`}
					value={field.input ?? ""}
				/>
				<InputField.Error>{field.errors?.[0]}</InputField.Error>
			</InputField.Root>
			<Button
				onClick={removeTextAlias}
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

export function ArtistFormTextAliases(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const textAliases = useFieldArray(formStore, {
		path: ["data", "text_aliases"],
	})

	const addTextAlias = () => {
		insert(formStore, { path: textAliases.path })
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Text Aliases`}</label>
				<Button
					onClick={addTextAlias}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>

			<ul {...stylex.attrs(styles.entries)}>
				<Intersperse
					of={textAliases.items}
					with={
						<li
							aria-hidden="true"
							{...stylex.attrs(dividerStyles.horizontal)}
						></li>
					}
					fallback={<FieldArrayFallback />}
				>
					{(_, index) => <TextAliasRow index={index()} />}
				</Intersperse>
			</ul>
		</div>
	)
}
