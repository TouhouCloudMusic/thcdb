import { Field, FieldArray, getErrors, insert, remove } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { Cross1Icon, PlusIcon } from "@thc/icons/radix"
import { For } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FieldArrayFallback } from "~/component/form"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import { useTagForm } from "../context"

const styles = stylex.create({
	field: { display: "flex", minHeight: px[128], flexDirection: "column" },
	fieldHeader: {
		marginBottom: px[16],
		display: "flex",
		alignContent: "space-between",
		justifyContent: "space-between",
		alignItems: "center",
		gap: px[16],
	},
	fieldLabel: { margin: 0 },
	editButton: { height: "max-content", padding: px[8] },
	editIcon: { width: px[16], height: px[16] },
	names: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[8],
	},
	nameRow: { display: "flex", gap: px[8] },
	nameInput: { flexGrow: 1 },
})

type Props = {
	styles?: StyleXStyles
}

export function TagFormAltNamesField(props: Props) {
	const { t } = useLingui()
	const { formStore } = useTagForm()

	const addAltName = () => {
		insert(formStore, {
			path: ["data", "alt_names"],
		})
	}

	const removeAltNameAt = (index: number) => () => {
		remove(formStore, { path: ["data", "alt_names"], at: index })
	}

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
			<div {...stylex.attrs(styles.fieldHeader)}>
				<label
					{...stylex.attrs(formStyles.label, styles.fieldLabel)}
				>{t`Alternative Names`}</label>
				<Button
					onClick={addAltName}
					appearance="ghost"
					tone="gray"
					styles={styles.editButton}
				>
					<PlusIcon {...stylex.attrs(styles.editIcon)} />
				</Button>
			</div>
			<FormComp.ErrorList
				errors={getErrors(formStore, { path: ["data", "alt_names"] })}
			/>
			<FieldArray
				of={formStore}
				path={["data", "alt_names"]}
			>
				{(fieldArray) => (
					<ul {...stylex.attrs(styles.names)}>
						<For
							each={fieldArray.items}
							fallback={<FieldArrayFallback />}
						>
							{(_, idx) => (
								<li {...stylex.attrs(styles.nameRow)}>
									<Field
										of={formStore}
										path={["data", "alt_names", idx()]}
									>
										{(field) => (
											<InputField.Root styles={styles.nameInput}>
												<InputField.Input
													{...field.props}
													value={field.input ?? ""}
													placeholder={t`Name`}
												/>
												<InputField.Error>
													{field.errors ? field.errors[0] : undefined}
												</InputField.Error>
											</InputField.Root>
										)}
									</Field>
									<Button
										onClick={removeAltNameAt(idx())}
										appearance="ghost"
										tone="gray"
										size="sm"
									>
										<Cross1Icon />
									</Button>
								</li>
							)}
						</For>
					</ul>
				)}
			</FieldArray>
		</div>
	)
}
