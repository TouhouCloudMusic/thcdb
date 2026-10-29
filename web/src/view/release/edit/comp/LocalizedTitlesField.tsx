import { useFieldArray, insert, remove, useField } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageSelect } from "~/component/form/stateful/LanguageSelect"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
	field: {
		display: "flex",
		minHeight: px[128],
		width: "100%",
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
})

const rowStyles = stylex.create({
	item: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
		gap: px[8],
	},
})

function LocalizedTitleRow(props: { of: ReleaseFormStore; index: number }) {
	const { t } = useLingui()

	const title = useField(
		() => props.of,
		() => ({
			path: ["data", "localized_titles", props.index, "title"],
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
		<li {...stylex.attrs(rowStyles.item)}>
			<InputField.Root>
				<InputField.Input
					{...title.props}
					placeholder={t`Title`}
					value={title.input}
				/>
				<InputField.Error>{title.errors?.[0]}</InputField.Error>
			</InputField.Root>
			<LanguageSelect
				value={language.input}
				onChange={language.onInput}
			/>
			<Button
				onClick={removeTitle}
				appearance="ghost"
				tone="gray"
				size="sm"
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}

export function LocalizedTitlesField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const titles = useFieldArray(() => props.of, {
		path: ["data", "localized_titles"],
	})

	const addTitle = () => insert(props.of, { path: titles.path })

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Localized Titles`}</label>
				<Button
					onClick={addTitle}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>
			<ul {...stylex.attrs(styles.list)}>
				<For
					each={titles.items}
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
