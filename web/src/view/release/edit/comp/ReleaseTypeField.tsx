import { Field } from "@formisch/solid"
import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { createUniqueId, For } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { Select } from "~/component/atomic/form/select"
import { RELEASE_TYPES } from "~/domain/release"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import { radius, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
	field: { display: "flex", flexDirection: "column" },
	trigger: {
		height: "auto",
		minHeight: px[36],
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[400],
		paddingInline: px[8],
		paddingBlock: px[4],
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		fontWeight: 300,
	},
})

export function ReleaseTypeField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}) {
	const triggerId = createUniqueId()
	const { t } = useLingui()
	const typeOptions = ["", ...RELEASE_TYPES] as ["", ...typeof RELEASE_TYPES]

	return (
		<Field
			of={props.of}
			path={["data", "release_type"]}
		>
			{(field) => (
				<div {...stylex.attrs(styles.field, props.styles)}>
					<label
						for={triggerId}
						{...stylex.attrs(formStyles.label)}
					>
						<Trans>Release Type</Trans>
					</label>
					<Select.Root<(typeof typeOptions)[number]>
						name={field.props.name}
						value={field.input ?? ""}
						onChange={(value) => {
							field.onInput(value || undefined)
						}}
						options={typeOptions}
						itemComponent={(itemProps) => (
							<Select.Item item={itemProps.item}>
								{itemProps.item.rawValue === ""
									? t`-- Please select release type --`
									: itemProps.item.rawValue}
							</Select.Item>
						)}
					>
						<Select.HiddenSelect
							onChange={field.props.onChange}
							onInput={field.props.onInput}
							onBlur={field.props.onBlur}
							onFocus={field.props.onFocus}
						/>
						<Select.Trigger
							id={triggerId}
							styles={styles.trigger}
						>
							<Select.Value<string>>
								{(state) => {
									const selectedOption = state.selectedOption()
									return selectedOption === ""
										? t`-- Please select release type --`
										: selectedOption
								}}
							</Select.Value>
							<Select.Icon />
						</Select.Trigger>
						<Select.Portal>
							<Select.Content>
								<Select.Listbox />
							</Select.Content>
						</Select.Portal>
					</Select.Root>
					<For each={field.errors}>
						{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
					</For>
				</div>
			)}
		</Field>
	)
}
