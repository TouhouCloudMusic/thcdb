/* @refresh reload */
import { Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useBlocker } from "@tanstack/solid-router"
import type { Label } from "@thc/api"
import type { JSX } from "solid-js"
import { Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { ExternalLinksField } from "~/component/form/ExternalLinksField"
import { NewLabelCorrection } from "~/domain/label"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { LabelDateFields } from "./comp/LabelDateFields"
import { LabelFormDesc } from "./comp/LabelFormDesc"
import { LabelFoundersField } from "./comp/LabelFoundersField"
import { LabelLocalizedNamesField } from "./comp/LabelLocalizedNamesField"
import { LabelNameField } from "./comp/LabelNameField"
import { LabelFormProvider } from "./context"
import { toLabelFormInitValue } from "./hook/init"
import { createLabelFormSubmission } from "./hook/submit"

const styles = stylex.create({
	page: { display: "grid", gridTemplateRows: "auto 1fr auto" },
	header: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		padding: px[32],
	},
	headerContent: { display: "flex", alignItems: "center", gap: px[16] },
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
	},
	form: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(1, minmax(0, 1fr))",
			"@media (min-width: 64rem)": "repeat(12, minmax(0, 1fr))",
		},
		columnGap: px[8],
		rowGap: px[32],
		padding: px[32],
		paddingBottom: "0rem",
	},
	fieldPlacement: {
		gridColumnStart: "1",
		gridColumnEnd: { default: "-1", "@media (min-width: 64rem)": "7" },
	},
})

type Props =
	| { type: "new" }
	| {
			type: "edit"
			label: Label
			pendingCorrectionId?: number
	  }

export function EditLabelPage(props: Props): JSX.Element {
	return (
		<PageLayout styles={styles.page}>
			<PageHeader type={props.type} />
			<FormContent {...props} />
		</PageLayout>
	)
}

function PageHeader(props: { type: Props["type"] }) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.header)}>
			<div {...stylex.attrs(styles.headerContent)}>
				<h1 {...stylex.attrs(styles.title)}>
					<Show
						when={props.type === "new"}
						fallback={t`Edit Label`}
					>
						Create Label
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = toLabelFormInitValue(props)
	const { handleSubmit, mutation, pendingCorrectionId } =
		createLabelFormSubmission(props)

	const form = createForm({
		schema: NewLabelCorrection,
		initialInput: initialValues,
	})

	useBlocker({
		shouldBlockFn() {
			if (form.isSubmitted || !form.isDirty) return false

			const stay = confirm(
				t({
					message:
						"Are you sure you want to leave this page? Your changes will be lost.",
				}),
			)
			return !stay
		},
	})

	const isSubmitting = () => mutation.isPending || form.isSubmitting

	return (
		<PendingCorrectionBoundary correctionId={pendingCorrectionId()}>
			<LabelFormProvider
				value={{
					get label() {
						if (props.type === "edit") return props.label
					},
					formStore: form,
				}}
			>
				<Form
					of={form}
					// TODO: Temporary workaround for upstream type defs; refactor once the library fixes its typing bug.
					onSubmit={(output, _) => handleSubmit(output)}
				>
					<div {...stylex.attrs(styles.form)}>
						<LabelNameField styles={styles.fieldPlacement} />
						<LabelDateFields styles={styles.fieldPlacement} />
						<LabelLocalizedNamesField
							styles={styles.fieldPlacement}
							initLocalizedNames={
								props.type === "edit" ? props.label.localized_names : undefined
							}
						/>
						<LabelFoundersField
							styles={styles.fieldPlacement}
							initFounderIds={props.type === "edit" ? props.label.founders : []}
						/>
						<ExternalLinksField
							of={form}
							styles={styles.fieldPlacement}
						/>
						<LabelFormDesc
							styles={styles.fieldPlacement}
							mutation={mutation}
						/>
					</div>
					<FormActionBar
						submitting={isSubmitting()}
						disabled={isSubmitting()}
					/>
				</Form>
			</LabelFormProvider>
		</PendingCorrectionBoundary>
	)
}
