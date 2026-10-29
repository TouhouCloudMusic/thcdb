import { useField } from "@formisch/solid"
import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import type { ReleaseType } from "@thc/api"

import { Select } from "~/component/atomic/form/select"
import { RELEASE_TYPES } from "~/domain/release"
import { palette } from "~/style/color/palette.stylex"
import { radius, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import type { ReleaseFormStore } from "./types"

const styles = stylex.create({
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

type ReleaseTypeOption = {
	value: ReleaseType | undefined
	label: string
}

export function ReleaseTypeField(props: {
	of: ReleaseFormStore
	styles?: StyleXStyles
}) {
	const { t } = useLingui()

	const field = useField(() => props.of, { path: ["data", "release_type"] })

	const options = (): ReleaseTypeOption[] => [
		{ value: undefined, label: t`-- Please select release type --` },
		...RELEASE_TYPES.map((value) => ({ value, label: value })),
	]

	const selectedOption = () =>
		options().find((option) => option.value === field.input)

	const selectOption = (option: ReleaseTypeOption | undefined) =>
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
			placeholder={t`-- Please select release type --`}
			styles={props.styles}
		>
			<Select.Label>
				<Trans>Release Type</Trans>
			</Select.Label>
			<Select.Trigger styles={styles.trigger} />
			<Select.Content />
			<Select.ErrorList />
		</Select.Root>
	)
}
