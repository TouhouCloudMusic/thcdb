/* @refresh reload */
import { Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useBlocker } from "@tanstack/solid-router"
import type { Tag } from "@thc/api"
import type { JSX } from "solid-js"
import { Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { NewTagCorrection } from "~/domain/tag"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { TagFormAltNamesField } from "./comp/TagAltNames"
import { TagFormDescriptionField } from "./comp/TagDescription"
import { TagFormDesc } from "./comp/TagFormActions"
import { TagFormNameField } from "./comp/TagName"
import { TagFormRelationsField } from "./comp/TagRelationsField"
import { TagFormShortDescriptionField } from "./comp/TagShortDescription"
import { TagFormTypeField } from "./comp/TagTypeField"
import { TagFormProvider } from "./context"
import { toTagFormInitValue } from "./hook/init"
import { createTagFormSubmission } from "./hook/submit"

const styles = stylex.create({
	page: { display: "grid", gridTemplateRows: "auto 1fr auto" },
	pageHeader: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		padding: px[32],
	},
	headingRow: { display: "flex", alignItems: "center", gap: px[16] },
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-.025em",
	},
	form: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(1, minmax(0, 1fr))",
			"@media (min-width: 64rem)": "repeat(12, minmax(0, 1fr))",
		},
		columnGap: px[8],
		rowGap: px[32],
		paddingTop: px[32],
		paddingInline: px[32],
		paddingBottom: 0,
	},
	formField6: {
		gridColumnStart: "1",
		gridColumnEnd: { default: "-1", "@media (min-width: 64rem)": "6" },
	},
	formField4: {
		gridColumnStart: "1",
		gridColumnEnd: { default: "-1", "@media (min-width: 64rem)": "4" },
	},
	fullField: {
		gridColumn: "1 / -1",
	},
})

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			tag: Tag
			pendingCorrectionId?: number
	  }

export function EditTagPage(props: Props): JSX.Element {
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
		<div {...stylex.attrs(styles.pageHeader)}>
			<div {...stylex.attrs(styles.headingRow)}>
				<h1 {...stylex.attrs(styles.title)}>
					<Show
						when={props.type === "new"}
						fallback={t`Edit Tag`}
					>
						Create Tag
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = toTagFormInitValue(props)
	const { handleSubmit, mutation, pendingCorrectionId } =
		createTagFormSubmission(props)

	const form = createForm({
		schema: NewTagCorrection,
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
			<TagFormProvider
				value={{
					get tag() {
						if (props.type === "edit") {
							return props.tag
						}
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
						<TagFormNameField styles={styles.formField6} />
						<TagFormTypeField styles={styles.formField4} />
						<TagFormShortDescriptionField styles={styles.formField6} />
						<TagFormDescriptionField styles={styles.formField6} />
						<TagFormAltNamesField styles={styles.formField6} />
						<TagFormRelationsField styles={styles.formField6} />
						<TagFormDesc
							styles={styles.fullField}
							mutation={mutation}
						/>
					</div>
					<FormActionBar
						submitting={isSubmitting()}
						disabled={isSubmitting()}
					/>
				</Form>
			</TagFormProvider>
		</PendingCorrectionBoundary>
	)
}
