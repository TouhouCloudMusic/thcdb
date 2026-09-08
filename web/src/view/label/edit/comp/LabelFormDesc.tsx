import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { LabelMutation } from "@thc/query"
import { For } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { useLabelForm } from "../context"

const styles = stylex.create({
	field: {
		display: "flex",
		flexDirection: "column",
		gap: px[16],
	},
	description: { minHeight: px[128] },
	errors: { display: "flex", flexDirection: "column" },
	errorMessage: { fontSize: fontSizes.lg, lineHeight: lineHeights.lg },
})

type Props = {
	mutation: ReturnType<typeof LabelMutation.getInstance>
	styles?: StyleXStyles
}

export function LabelFormDesc(props: Props) {
	const { t } = useLingui()
	const { formStore } = useLabelForm()

	return (
		<div {...stylex.attrs(styles.field, props.styles)}>
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
							styles={styles.description}
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
					<>
						<input
							{...field.props}
							type="hidden"
							value={field.input}
						/>
						<For each={field.errors}>
							{(error) => <InputField.Error>{error}</InputField.Error>}
						</For>
					</>
				)}
			</Field>

			<div {...stylex.attrs(styles.errors)}>
				<FormComp.ErrorMessage styles={styles.errorMessage}>
					{props.mutation.isError ? props.mutation.error.message : undefined}
				</FormComp.ErrorMessage>
			</div>
		</div>
	)
}
