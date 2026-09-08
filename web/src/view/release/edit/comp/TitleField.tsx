// 标题字段
import { Field } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"

import { InputField } from "~/component/atomic/form/Input"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
	field: { display: "flex", flexDirection: "column" },
	input: { marginRight: px[8] },
})

export function TitleField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()
	return (
		<Field
			of={props.of}
			path={["data", "title"]}
		>
			{(field) => (
				<InputField.Root styles={[styles.field, props.styles]}>
					<label {...stylex.attrs(formStyles.label)}>{t`Title`}</label>
					<InputField.Input
						{...field.props}
						styles={styles.input}
						placeholder={t`Title`}
						value={field.input ?? undefined}
					/>
					<InputField.Error>
						{field.errors ? field.errors[0] : undefined}
					</InputField.Error>
				</InputField.Root>
			)}
		</Field>
	)
}
