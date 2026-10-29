import { useField } from "@formisch/solid"
import { Trans, useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { ArtistType } from "@thc/api"

import { Select } from "~/component/atomic/form/select"
import { ARTIST_TYPES } from "~/domain/artist/constants"
import { palette } from "~/style/color/palette.stylex"
import { radius, px } from "~/style/tokens.stylex"

import { useArtistForm } from "../context"

const styles = stylex.create({
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

type ArtistTypeOption = {
	value: ArtistType | undefined
	label: string
}

export function ArtistFormArtistTypeField(props: { styles?: StyleXStyles }) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const field = useField(formStore, { path: ["data", "artist_type"] })

	const options = (): ArtistTypeOption[] => [
		{ value: undefined, label: t`-- Please select artist type --` },
		...ARTIST_TYPES.map((value) => ({ value, label: value })),
	]

	const selectedOption = () =>
		options().find((option) => option.value === field.input)

	const selectOption = (option: ArtistTypeOption | undefined) =>
		field.onInput(option?.value)

	return (
		<Select.Root
			value={selectedOption()}
			onChange={selectOption}
			fieldProps={field.props}
			errors={field.errors}
			options={options()}
			optionValue="label"
			optionTextValue="label"
			placeholder={t`-- Please select artist type --`}
			styles={props.styles}
		>
			<Select.Label>
				<Trans>Artist Type</Trans>
			</Select.Label>
			<div {...stylex.attrs(styles.typeControl)}>
				<Select.Trigger styles={styles.typeTrigger} />
				<Select.Content />
				<Select.ErrorList />
			</div>
		</Select.Root>
	)
}
