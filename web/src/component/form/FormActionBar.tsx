import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"

import { Button } from "~/component/atomic/button"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"

const styles = stylex.create({
	root: {
		position: "sticky",
		bottom: 0,
		gridColumn: "1 / -1",
		display: "flex",
		justifyContent: "end",
		borderTopWidth: 1,
		borderTopStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		padding: px[16],
	},
	actions: {
		display: "grid",
		gridTemplateColumns: "repeat(2,minmax(0,1fr))",
		gap: px[8],
	},
	button: { paddingInline: px[12], paddingBlock: px[6] },
	submitting: { cursor: "wait", opacity: 0.8 },
})
type Props = {
	styles?: StyleXStyles
	submitting: boolean
	disabled?: boolean
	onBack?: () => void
	onSubmit?: () => void
}

export function FormActionBar(props: Props) {
	const { t } = useLingui()
	const handleBack = () => {
		if (props.onBack) {
			props.onBack()
		} else {
			history.back()
		}
	}

	const submitLabel = t`Submit`
	const submittingLabel = t`Submitting`
	const backLabel = t`Back`

	return (
		<div {...stylex.attrs(styles.root, props.styles)}>
			<div {...stylex.attrs(styles.actions)}>
				<Button
					onClick={handleBack}
					appearance="ghost"
					tone="gray"
					styles={styles.button}
				>
					{backLabel}
				</Button>
				<Button
					type="submit"
					disabled={props.disabled}
					onClick={props.onSubmit}
					appearance="solid"
					tone="gray"
					styles={[styles.button, props.submitting && styles.submitting]}
				>
					{props.submitting ? submittingLabel : submitLabel}
				</Button>
			</div>
		</div>
	)
}
