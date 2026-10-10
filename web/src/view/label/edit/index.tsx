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
import { useArrayField } from "~/component/form/useArrayField"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"
import * as typography from "~/style/typography"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { LabelDateFields } from "./comp/LabelDateFields"
import { LabelFormDesc } from "./comp/LabelFormDesc"
import { LabelFoundersField } from "./comp/LabelFoundersField"
import { LabelLocalizedNamesField } from "./comp/LabelLocalizedNamesField"
import { LabelNameField } from "./comp/LabelNameField"
import { LabelFormProvider } from "./context"
import { toLabelFormInitValue } from "./hook/init"
import { createLabelFormSubmission } from "./hook/submit"
import { LabelFormSchema } from "./schema"

const styles = stylex.create({
	page: { display: "grid", gridTemplateRows: "auto 1fr auto" },
	header: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		padding: px[32],
	},
	headerContent: { display: "flex", alignItems: "center", gap: px[16] },
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

function PageHeader(props: { type: Props["type"] }) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.header)}>
			<div {...stylex.attrs(styles.headerContent)}>
				<h1 {...stylex.attrs(typography.heading.md)}>
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

export function EditLabelPage(props: Props): JSX.Element {
	const { t } = useLingui()
	const initialValues = toLabelFormInitValue(props)
	const { handleSubmit, mutation, pendingCorrectionId } =
		createLabelFormSubmission(props)

	const form = createForm({
		schema: LabelFormSchema,
		initialInput: initialValues,
	})

	const links = useArrayField(form, { path: ["data", "links"] })

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
		<PageLayout styles={styles.page}>
			<PageHeader type={props.type} />
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
						onSubmit={handleSubmit}
					>
						<div {...stylex.attrs(styles.form)}>
							<LabelNameField styles={styles.fieldPlacement} />
							<LabelDateFields styles={styles.fieldPlacement} />
							<LabelLocalizedNamesField styles={styles.fieldPlacement} />
							<LabelFoundersField styles={styles.fieldPlacement} />
							<ExternalLinksField
								field={links}
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
		</PageLayout>
	)
}
