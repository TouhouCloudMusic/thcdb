import { Field, FieldArray, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
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

export function ArtistFormTextAliases(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const addTextAlias = () => {
		insert(formStore, { path: ["data", "text_aliases"], initialInput: "" })
	}

	const removeTextAliasAt = (index: number) => () => {
		remove(formStore, { path: ["data", "text_aliases"], at: index })
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

			<FieldArray
				of={formStore}
				path={["data", "text_aliases"]}
			>
				{(fieldArray) => (
					<ul {...stylex.attrs(styles.entries)}>
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<>
									<li {...stylex.attrs(styles.actions)}>
										<Field
											of={formStore}
											path={["data", "text_aliases", idx()]}
										>
											{(field) => (
												<InputField.Root styles={[styles.input]}>
													<InputField.Input
														{...field.props}
														id={field.path.join(".")}
														placeholder={t`Name`}
														value={field.input ?? ""}
													/>
													<InputField.Error>
														{field.errors?.[0]}
													</InputField.Error>
												</InputField.Root>
											)}
										</Field>
										<Button
											onClick={removeTextAliasAt(idx())}
											appearance="ghost"
											tone="gray"
											size="sm"
											styles={styles.removeButton}
										>
											<Cross1Icon />
										</Button>
									</li>
									{idx() < fieldArray.items.length - 1 && (
										<span {...stylex.attrs(dividerStyles.horizontal)}></span>
									)}
								</>
							)}
						</For>
					</ul>
				)}
			</FieldArray>
		</div>
	)
}
