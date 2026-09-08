import { Form, createForm, getInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useBlocker } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { createEffect, Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { ExternalLinksField } from "~/component/form/ExternalLinksField"
import { NewEventCorrection } from "~/domain/event"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { EventAlternativeNamesField } from "./comp/EventAlternativeNamesField"
import { EventDateFields } from "./comp/EventDateFields"
import { EventDescriptionField } from "./comp/EventDescriptionField"
import { EventFormDesc } from "./comp/EventFormDesc"
import { EventLocationField } from "./comp/EventLocationField"
import { EventNameField } from "./comp/EventNameField"
import { EventShortDescriptionField } from "./comp/EventShortDescriptionField"
import { EventFormProvider } from "./context"
import type { EventWithLocation } from "./hook/init"
import { toEventFormInitValue } from "./hook/init"
import { createEventFormSubmission } from "./hook/submit"

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
	formField7: {
		gridColumnStart: "1",
		gridColumnEnd: { default: "-1", "@media (min-width: 64rem)": "7" },
	},
})

type Props =
	| { type: "new" }
	| {
			type: "edit"
			event: EventWithLocation
			pendingCorrectionId?: number
	  }

export function EditEventPage(props: Props): JSX.Element {
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
						fallback={t`Edit Event`}
					>
						Create Event
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = toEventFormInitValue(props)
	const { handleSubmit, mutation, pendingCorrectionId } =
		createEventFormSubmission(props)

	const form = createForm({
		schema: NewEventCorrection,
		initialInput: initialValues,
	})

	if (import.meta.env.DEV) {
		createEffect(() => {
			const val = getInput(form)
			console.log(val)
		})
	}

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
			<EventFormProvider
				value={{
					get event() {
						if (props.type === "edit") {
							return props.event
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
						<EventNameField styles={styles.formField7} />
						<EventShortDescriptionField styles={styles.formField7} />
						<EventDateFields styles={styles.formField7} />
						<EventLocationField styles={styles.formField7} />
						<EventDescriptionField styles={styles.formField7} />
						<EventAlternativeNamesField styles={styles.formField7} />
						<ExternalLinksField
							of={form}
							styles={styles.formField7}
						/>
						<EventFormDesc
							styles={styles.formField7}
							mutation={mutation}
						/>
					</div>
					<FormActionBar
						submitting={isSubmitting()}
						disabled={isSubmitting()}
					/>
				</Form>
			</EventFormProvider>
		</PendingCorrectionBoundary>
	)
}
