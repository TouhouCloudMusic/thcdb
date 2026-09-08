import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { ArrowPathIcon } from "@thc/icons/heroicons/24/outline"
import { createMemo } from "solid-js"

import { Button } from "~/component/atomic/button"
import { px } from "~/style/tokens.stylex"

import { AlertDialog } from "./AlertDialog"

const styles = stylex.create({
	reset: {
		marginRight: px[2],
		aspectRatio: "1",
		height: "100%",
		padding: px[6],
	},
})

export function ResetFieldDialogTrigger(props: {
	modal?: boolean
	fieldName: string
	onReset: () => void
}) {
	const { t } = useLingui()
	const fieldNameWithoutUnderscore = createMemo(() =>
		props.fieldName.replaceAll("_", " "),
	)
	return (
		<AlertDialog
			triggerAs={(triggerProps) => (
				<Button
					{...triggerProps}
					aria-label={`Reset ${fieldNameWithoutUnderscore()} field to initial state`}
					appearance="ghost"
					tone="gray"
					styles={styles.reset}
				>
					<ArrowPathIcon />
				</Button>
			)}
			title={t`Reset field?`}
			description={t`This cannot be undone.`}
			onCancel={() => {
				console.log("Cancel")
			}}
			onConfirm={props.onReset}
			cancelText="No"
			confirmText="Reset"
		/>
	)
}
