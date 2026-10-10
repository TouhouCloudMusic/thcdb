import {
	getInput,
	insert,
	remove,
	useField,
	useFieldArray,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Cross1Icon } from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { createMemo, For } from "solid-js"

import { FormComp } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import type { Tenure } from "~/domain/artist/schema"
import { colors, px } from "~/style/tokens.stylex"

import { useArtistForm } from "../../context"

const styles = stylex.create({
	sectionSpacing: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	tenures: {
		gridRowStart: "3",
	},
	header: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	label: {
		fontWeight: 300,
	},
	addButton: {
		fontWeight: 300,
		color: colors.textPrimary,
	},
})

type TenureErrorMessages = {
	leaveBeforeJoin: string
	leaveSameAsJoin: string
	joinBeforePreviousLeave: string
	joinSameAsPreviousLeave: string
}

const entryStyles = stylex.create({
	tenure: {
		display: "grid",
		gridTemplateColumns: "1fr auto",
		alignItems: "center",
		padding: px[6],
	},
	dates: {
		display: "flex",
		width: "100%",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[8],
	},
	dateField: {
		width: px[128],
		flex: "1",
	},
	dateInput: {
		appearance: "textfield",
		"::-webkit-outer-spin-button": {
			WebkitAppearance: "none",
			margin: 0,
		},
		"::-webkit-inner-spin-button": {
			WebkitAppearance: "none",
			margin: 0,
		},
	},
	separator: {
		color: colors.textSecondary,
	},
	removeButton: {
		padding: px[8],
	},
})

function computeTenureError(
	tenures: Tenure[],
	messages: TenureErrorMessages,
): string[] {
	const res: string[] = []

	for (const [index, tenure] of tenures.entries()) {
		const joinYear = tenure.join_year

		const leaveYear = tenure.leave_year

		if (typeof leaveYear === "number" && typeof joinYear === "number") {
			if (leaveYear < joinYear) {
				res.push(messages.leaveBeforeJoin)
			} else if (leaveYear === joinYear) {
				res.push(messages.leaveSameAsJoin)
			}
		}

		if (index > 0) {
			const prevLeave = tenures[index - 1]?.leave_year

			if (typeof prevLeave === "number" && typeof joinYear === "number") {
				if (joinYear < prevLeave) {
					res.push(messages.joinBeforePreviousLeave)
				} else if (joinYear === prevLeave) {
					res.push(messages.joinSameAsPreviousLeave)
				}
			}
		}
	}

	return res
}

function TenureRow(props: {
	membershipIndex: number
	index: number
	errors: string[]
}) {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const joinYear = useField(formStore, () => ({
		path: [
			"data",
			"memberships",
			props.membershipIndex,
			"tenure",
			props.index,
			"join_year",
		],
	}))

	const leaveYear = useField(formStore, () => ({
		path: [
			"data",
			"memberships",
			props.membershipIndex,
			"tenure",
			props.index,
			"leave_year",
		],
	}))

	const removeTenure = () =>
		remove(formStore, {
			path: ["data", "memberships", props.membershipIndex, "tenure"],
			at: props.index,
		})

	return (
		<li {...stylex.attrs(entryStyles.tenure)}>
			<div {...stylex.attrs(entryStyles.dates)}>
				<InputField.Root styles={entryStyles.dateField}>
					<InputField.Input
						{...joinYear.props}
						type="number"
						styles={entryStyles.dateInput}
						placeholder={t`Join year`}
						value={joinYear.input ?? undefined}
					/>
					<InputField.Error>{joinYear.errors?.[0]}</InputField.Error>
				</InputField.Root>
				<span {...stylex.attrs(entryStyles.separator)}>-</span>
				<InputField.Root styles={entryStyles.dateField}>
					<InputField.Input
						{...leaveYear.props}
						type="number"
						styles={entryStyles.dateInput}
						placeholder={t`Leave year`}
						value={leaveYear.input ?? undefined}
					/>
					<InputField.Error>{leaveYear.errors?.[0]}</InputField.Error>
				</InputField.Root>
			</div>
			<Button
				type="button"
				onClick={removeTenure}
				aria-label={t`Remove tenure entry`}
				title={t`Remove tenure entry`}
				appearance="ghost"
				tone="gray"
				size="sm"
				styles={entryStyles.removeButton}
			>
				<Cross1Icon />
			</Button>
			<ul>
				<For each={props.errors}>
					{(error) => <FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>}
				</For>
			</ul>
		</li>
	)
}

export function TenureFieldArray(props: {
	membershipIndex: number
}): JSX.Element {
	const { t } = useLingui()
	const { formStore } = useArtistForm()

	const tenures = useFieldArray(formStore, () => ({
		path: ["data", "memberships", props.membershipIndex, "tenure"],
	}))

	const addTenure = () => {
		insert(formStore, {
			path: tenures.path,
		})
	}

	const errors = createMemo(() =>
		computeTenureError(getInput(formStore, { path: tenures.path }), {
			leaveBeforeJoin: t`Leave year cannot be earlier than join year`,
			leaveSameAsJoin: t`Leave year cannot be the same as join year`,
			joinBeforePreviousLeave: t`Join year cannot be earlier than previous leave year`,
			joinSameAsPreviousLeave: t`Join year cannot be the same as previous leave year`,
		}),
	)

	return (
		<div {...stylex.attrs(styles.tenures)}>
			<div {...stylex.attrs(styles.header, styles.sectionSpacing)}>
				<span {...stylex.attrs(styles.label)}>{t`Tenures`}</span>
				<Button
					type="button"
					onClick={addTenure}
					appearance="ghost"
					tone="gray"
					size="sm"
					styles={styles.addButton}
				>
					{t`Add Tenure`}
				</Button>
			</div>

			<ul {...stylex.attrs(styles.sectionSpacing)}>
				<For each={tenures.items}>
					{(_, index) => (
						<TenureRow
							membershipIndex={props.membershipIndex}
							index={index()}
							errors={errors()}
						/>
					)}
				</For>
			</ul>
			<For each={tenures.errors}>
				{(error) => (
					<FormComp.ErrorMessage styles={styles.sectionSpacing}>
						{error}
					</FormComp.ErrorMessage>
				)}
			</For>
		</div>
	)
}
