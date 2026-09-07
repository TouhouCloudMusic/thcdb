import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { TagMutation } from "@thc/query"
import { For } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { useTagForm } from "../context"

const styles = stylex.create({
	correction: { display: "flex", flexDirection: "column", gap: px[16] },
	descriptionInput: { minHeight: px[128] },
	field: { display: "flex", flexDirection: "column" },
	error: { fontSize: fontSizes.lg, lineHeight: lineHeights.lg },
})

type Props = {
	mutation: ReturnType<typeof TagMutation.getInstance>
	styles?: StyleXStyles
}

export function TagFormDesc(props: Props) {
	const { t } = useLingui()
	const { formStore } = useTagForm()

	return (
		<div {...stylex.attrs(styles.correction, props.styles)}>
			<Field
				of={formStore}
				path={["description"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Label>{t`Correction Description`}</InputField.Label>
						<InputField.Textarea
							{...field.props}
							value={field.input ?? ""}
							styles={styles.descriptionInput}
						/>

						<For each={field.errors}>
							{(error) => <InputField.Error>{error}</InputField.Error>}
						</For>
					</InputField.Root>
				)}
			</Field>

			<Field
				of={formStore}
				path={["type"]}
			>
				{(field) => (
					<InputField.Root>
						<InputField.Input
							{...field.props}
							type="hidden"
							value={field.input}
						/>
						<For each={field.errors}>
							{(error) => <InputField.Error>{error}</InputField.Error>}
						</For>
					</InputField.Root>
				)}
			</Field>

			<div {...stylex.attrs(styles.field)}>
				<FormComp.ErrorMessage styles={styles.error}>
					{props.mutation.isError
						? `Error: ${props.mutation.error.message}`
						: undefined}
				</FormComp.ErrorMessage>
			</div>
		</div>
	)
}
