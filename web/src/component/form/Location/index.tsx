import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import { Nil } from "@thc/toolkit/data"
import { produce } from "immer"
import { For } from "solid-js"

import { InputField } from "~/component/atomic/form/Input"
import type { Location as LocationType } from "~/domain/shared"
import { formStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"

const styles = stylex.create({
	fields: { display: "flex", gap: px[16] },
})

export type LocationProps = {
	styles?: StyleXStyles
	label: string
	value?: LocationType | null
	setValue(val?: LocationType): void
}
export function Location(props: LocationProps) {
	const { t } = useLingui()
	const fields = [
		{
			key: "country",
			get name() {
				return t`Country / Region`
			},
		},
		{
			key: "province",
			get name() {
				return t`Province`
			},
		},
		{
			key: "city",
			get name() {
				return t`City`
			},
		},
	] as const

	return (
		<div {...stylex.attrs(props.styles)}>
			<label {...stylex.attrs(formStyles.label)}>{props.label}</label>
			<div {...stylex.attrs(styles.fields)}>
				<For each={fields}>
					{(item) => (
						<InputField.Root
							value={props.value?.[item.key] ?? ""}
							onChange={(value) =>
								props.setValue(
									produce(props.value ?? {}, (draft) => {
										draft[item.key] = Nil.filter(Boolean, value)
									}),
								)
							}
						>
							<InputField.Input placeholder={item.name} />
						</InputField.Root>
					)}
				</For>
			</div>
		</div>
	)
}
