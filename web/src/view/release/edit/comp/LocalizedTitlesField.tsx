import { Field, FieldArray, insert, remove, setInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { Language } from "@thc/api"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { LanguageCombobox } from "~/component/form/stateful/LanguageCombobox"
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
	item: {
		display: "grid",
		gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr) auto",
		gap: px[8],
	},
})

export function LocalizedTitlesField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.header)}>
				<label
					{...stylex.attrs(formStyles.label, styles.label)}
				>{t`Localized Titles`}</label>
				<Button
					onClick={() =>
						insert(props.of, {
							path: ["data", "localized_titles"],
							initialInput: {
								language_id: undefined,
								title: "",
							},
						})
					}
					appearance="ghost"
					tone="gray"
					styles={styles.addButton}
				>
					<PlusIcon {...stylex.attrs(styles.icon)} />
				</Button>
			</div>
			<ul {...stylex.attrs(styles.list)}>
				<FieldArray
					of={props.of}
					path={["data", "localized_titles"]}
				>
					{(fa) => (
						<For
							each={fa.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<LocalizedTitleItem
									index={idx()}
									of={props.of}
								/>
							)}
						</For>
					)}
				</FieldArray>
			</ul>
		</div>
	)
}

function LocalizedTitleItem(props: { index: number; of: ReleaseFormStore }) {
	const { t } = useLingui()
	const onLangChange = (v: Language | null) => {
		setInput(props.of, {
			path: ["data", "localized_titles", props.index, "language_id"],
			// @ts-expect-error
			input: v?.id,
		})
	}

	return (
		<li {...stylex.attrs(styles.item)}>
			<Field
				of={props.of}
				path={["data", "localized_titles", props.index, "title"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Input
							{...field.props}
							placeholder={t`Title`}
							value={field.input}
						/>
						<InputField.Error>
							{field.errors ? field.errors[0] : undefined}
						</InputField.Error>
					</InputField.Root>
				)}
			</Field>
			{/* TODO: form init value */}
			<LanguageCombobox onChange={onLangChange} />
			<Button
				onClick={() =>
					remove(props.of, {
						path: ["data", "localized_titles"],
						at: props.index,
					})
				}
				appearance="ghost"
				tone="gray"
				size="sm"
			>
				<Cross1Icon />
			</Button>
		</li>
	)
}
