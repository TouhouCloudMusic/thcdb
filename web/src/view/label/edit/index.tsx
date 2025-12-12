/* @refresh reload */
import { Form, createForm } from "@formisch/solid"
import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { useBlocker } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { NewLabelCorrection } from "~/domain/label"
import { PageLayout } from "~/layout/PageLayout"

import { LabelDateFields } from "./comp/LabelDateFields"
import { LabelFormDesc } from "./comp/LabelFormDesc"
import { LabelFoundersField } from "./comp/LabelFoundersField"
import { LabelLocalizedNamesField } from "./comp/LabelLocalizedNamesField"
import { LabelNameField } from "./comp/LabelNameField"
import { LabelFormProvider } from "./context"
import type { LabelFormInitProps as Props } from "./hook/init"
import { toLabelFormInitValue } from "./hook/init"
import { createLabelFormSubmission } from "./hook/submit"

export function EditLabelPage(props: Props): JSX.Element {
	return (
		<PageLayout class="grid grid-rows-[auto_1fr_auto]">
			<PageHeader type={props.type} />
			<FormContent {...props} />
		</PageLayout>
	)
}

function PageHeader(props: { type: Props["type"] }) {
	const { t } = useLingui()

	return (
		<div class="border-b-1 border-slate-300 p-8">
			<div class="flex items-center gap-4">
				<h1 class="text-2xl font-light tracking-tight">
					<Show
						when={props.type === "new"}
						fallback={<Trans>Edit Label</Trans>}
					>
						{t`Create Label`}
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = toLabelFormInitValue(props)
	const { handleSubmit, mutation } = createLabelFormSubmission(props)

	const form = createForm({
		schema: NewLabelCorrection,
		initialInput: initialValues,
	})

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
				onSubmit={(output) => handleSubmit(output)}
			>
				<div class="grid grid-cols-1 space-y-8 gap-x-2 p-8 pb-0 *:col-span-full lg:grid-cols-12">
					<LabelNameField class="lg:col-end-7" />
					<LabelDateFields class="lg:col-end-7" />
					<LabelLocalizedNamesField
						class="lg:col-end-7"
						initLocalizedNames={
							props.type === "edit" ? props.label.localized_names : undefined
						}
					/>
					<LabelFoundersField
						class="lg:col-end-7"
						initFounderIds={props.type === "edit" ? props.label.founders : []}
					/>
					<LabelFormDesc
						class="lg:col-end-7"
						mutation={mutation}
					/>
				</div>
				<FormActionBar
					submitting={isSubmitting()}
					disabled={isSubmitting()}
				/>
			</Form>
		</LabelFormProvider>
	)
}
