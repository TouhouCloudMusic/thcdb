import { useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
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
	setValue(val?: LocationType): void
}
export function Location(props: LocationProps) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(props.styles)}>
			<label {...stylex.attrs(formStyles.label)}>{props.label}</label>
			<div {...stylex.attrs(styles.fields)}>
				<For
					each={[
						{
							name: t`Country / Region`,
						},
						{
							name: t`Province`,
						},
						{
							name: t`City`,
						},
					]}
				>
					{(item) => (
						<InputField.Root>
							<InputField.Input placeholder={item.name} />
						</InputField.Root>
					)}
				</For>
			</div>
		</div>
	)
}
