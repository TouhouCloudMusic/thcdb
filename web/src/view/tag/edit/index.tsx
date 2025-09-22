/* @refresh reload */
import { Form, createForm, getInput } from "@formisch/solid"
import { Trans, useLingui } from "@lingui-solid/solid/macro"
import { useBlocker } from "@tanstack/solid-router"
import type { Tag } from "@thc/api"
import type { JSX } from "solid-js"
import { createEffect, Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { NewTagCorrection } from "~/domain/tag"
import { PageLayout } from "~/layout/PageLayout"

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

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			tag: Tag
	  }

export function EditTagPage(props: Props): JSX.Element {
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
						fallback={<Trans>Edit Tag</Trans>}
					>
						<Trans>Create Tag</Trans>
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = toTagFormInitValue(props)
	const { handleSubmit, mutation } = createTagFormSubmission(props)

	const form = createForm({
		schema: NewTagCorrection,
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
				onSubmit={(output) => handleSubmit(output)}
			>
				<div class="grid grid-cols-1 space-y-8 gap-x-2 p-8 pb-0 *:col-span-full lg:grid-cols-12">
					<TagFormNameField class="lg:col-end-6" />
					<TagFormTypeField class="lg:col-end-4" />
					<TagFormShortDescriptionField class="lg:col-end-6" />
					<TagFormDescriptionField class="lg:col-end-6" />
					<TagFormAltNamesField class="lg:col-end-6" />
					<TagFormRelationsField class="lg:col-end-6" />
					<TagFormDesc
						class=""
						mutation={mutation}
					/>
				</div>
				<FormActionBar
					submitting={isSubmitting()}
					disabled={isSubmitting()}
				/>
			</Form>
		</TagFormProvider>
	)
}
