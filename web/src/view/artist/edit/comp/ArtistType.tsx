import { Field } from "@formisch/solid"
import { Trans, useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { ArtistType } from "@thc/api"
import { createUniqueId } from "solid-js"

import { Select } from "~/component/atomic/form/select"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import { radius, px } from "~/style/tokens.stylex"

import { useArtistForm } from "../context"

const styles = stylex.create({
	column: {
		display: "flex",
		flexDirection: "column",
	},
	typeControl: {
		width: "fit-content",
		borderRadius: radius.xs,
		borderWidth: 1,
		borderStyle: "solid",
		borderColor: palette.slate[300],
		fontWeight: 300,
	},
	typeTrigger: {
		boxSizing: "border-box",
		height: px[32],
		width: "100%",
		minWidth: "max-content",
		borderRadius: radius.sm,
		paddingInline: px[4],
		whiteSpace: "nowrap",
		outlineWidth: {
			default: 1,
			":focus": 2,
		},
		outlineStyle: "solid",
		outlineColor: {
			default: "transparent",
			":focus": palette.reimu[600],
			"@media (hover: hover)": {
				default: null,
				":is(:not(:disabled):hover)": palette.reimu[500],
			},
		},
	},
})

const ARTIST_TYPE_OPTIONS: ("" | ArtistType)[] = [
	"",
	"Solo",
	"Multiple",
	"Unknown",
]

export function ArtistFormArtistTypeField(props: { styles?: StyleXStyles }) {
	const triggerId = createUniqueId()
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	return (
		<Field
			of={formStore}
			path={["data", "artist_type"]}
		>
			{(field) => (
				<div {...stylex.attrs(styles.column, props.styles)}>
					<label
						for={triggerId}
						{...stylex.attrs(formStyles.label)}
					>
						<Trans>Artist Type</Trans>
					</label>
					<div {...stylex.attrs(styles.typeControl)}>
						<Select.Root<"" | ArtistType>
							name={field.props.name}
							value={field.input ?? ""}
							onChange={(value) => {
								const next = value ?? ""
								field.onInput(next === "" ? undefined : next)
							}}
							options={ARTIST_TYPE_OPTIONS}
							itemComponent={(itemProps) => (
								<Select.Item item={itemProps.item}>
									{itemProps.item.rawValue === ""
										? t`-- Please select artist type --`
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
								styles={[styles.typeTrigger]}
							>
								<Select.Value<"" | ArtistType>>
									{(state) => {
										const selectedOption = state.selectedOption()
										return selectedOption === ""
											? t`-- Please select artist type --`
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
					</div>
				</div>
			)}
		</Field>
	)
}
