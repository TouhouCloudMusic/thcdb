import { Form, createForm, getInput } from "@formisch/solid"
import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { useBlocker } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { createEffect, Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { NewEventCorrection } from "~/domain/event"
import { PageLayout } from "~/layout/PageLayout"

import { EventAlternativeNamesField } from "./comp/EventAlternativeNamesField"
import { EventDateFields } from "./comp/EventDateFields"
import { EventDescriptionField } from "./comp/EventDescriptionField"
import { EventFormDesc } from "./comp/EventFormDesc"
import { EventLocationField } from "./comp/EventLocationField"
import { EventNameField } from "./comp/EventNameField"
import { EventShortDescriptionField } from "./comp/EventShortDescriptionField"
import { EventFormProvider } from "./context"
import type { EventFormInitProps as Props } from "./hook/init"
import { toEventFormInitValue } from "./hook/init"
import { createEventFormSubmission } from "./hook/submit"

export function EditEventPage(props: Props): JSX.Element {
	return (
		<PageLayout class="grid grid-rows-[auto_1fr_auto]">
			<PageHeader type={props.type} />
			<FormContent {...props} />
		</PageLayout>
	)
}

function PageHeader(props: { type: Props["type"] }) {
	return (
		<div class="border-b-1 border-slate-300 p-8">
			<div class="flex items-center gap-4">
				<h1 class="text-2xl font-light tracking-tight">
					<Show
						when={props.type === "new"}
						fallback={<Trans>Edit Event</Trans>}
					>
						<Trans>Create Event</Trans>
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = toEventFormInitValue(props)
	const { handleSubmit, mutation } = createEventFormSubmission(props)

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
				t`Are you sure you want to leave this page? Your changes will be lost.`,
			)
			return !stay
		},
	})

	const isSubmitting = () => mutation.isPending || form.isSubmitting

	return (
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
				onSubmit={(output) => handleSubmit(output)}
			>
				<div class="grid grid-cols-1 space-y-8 gap-x-2 p-8 pb-0 *:col-span-full lg:grid-cols-12">
					<EventNameField class="lg:col-end-7" />
					<EventShortDescriptionField class="lg:col-end-7" />
					<EventDateFields class="lg:col-end-7" />
					<EventLocationField class="lg:col-end-7" />
					<EventDescriptionField class="lg:col-end-7" />
					<EventAlternativeNamesField class="lg:col-end-7" />
					<EventFormDesc
						class="lg:col-end-7"
						mutation={mutation}
					/>
				</div>
				<FormActionBar
					submitting={isSubmitting()}
					disabled={isSubmitting()}
				/>
			</Form>
		</EventFormProvider>
	)
}
