import {
	Field,
	Form,
	createForm,
	getAllErrors,
	getErrors,
	getInput,
	setInput,
} from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { useBlocker } from "@tanstack/solid-router"
import type { Release } from "@thc/api"
import type { JSX } from "solid-js"
import { createEffect, For, Show } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FormActionBar } from "~/component/form"
import { DateWithPrecision } from "~/component/form/DateWithPrecision"
import { NewReleaseCorrection as NewReleaseCorrectionSchema } from "~/domain/release"
import { PageLayout } from "~/layout/PageLayout"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { LocalizedTitlesField } from "./comp/LocalizedTitlesField"
import { ReleaseArtistsField } from "./comp/ReleaseArtistsField"
import { ReleaseCatalogNumbersField } from "./comp/ReleaseCatalogNumbersField"
import { ReleaseCreditsField } from "./comp/ReleaseCreditsField"
import { ReleaseEventsField } from "./comp/ReleaseEventsField"
import { ReleaseTracksField } from "./comp/ReleaseTracksField"
import { ReleaseTypeField } from "./comp/ReleaseTypeField"
import { TitleField } from "./comp/TitleField"
import { useReleaseFormInitialValues } from "./hook/useFormInitialValues"
import { useReleaseFormSubmission } from "./hook/useFormSubmission"

type Props =
	| { type: "new" }
	| { type: "edit"; release: Release; pendingCorrectionId?: number }

export function EditReleasePage(props: Props): JSX.Element {
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
				<h1 class="text-2xl font-light">
					<Show
						when={props.type === "new"}
						fallback={<>{t`Edit Release`}</>}
					>
						Create Release
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = useReleaseFormInitialValues(props)

	const form = createForm({
		schema: NewReleaseCorrectionSchema,
		initialInput: initialValues,
	})

	if (import.meta.env.DEV) {
		createEffect(() => {
			const val = getInput(form)
			console.log(val)
		})
	}

	const { handleSubmit, pendingCorrectionId } = useReleaseFormSubmission(props)
	const handleSubmitClick = () => {
		if (import.meta.env.DEV) {
			const errs = getAllErrors(form)
			console.log(errs)
		}
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

	return (
		<PendingCorrectionBoundary correctionId={pendingCorrectionId()}>
			<Form
				of={form}
				// TODO: Temporary workaround for upstream type defs; refactor once the library fixes its typing bug.
				onSubmit={(out, _) => handleSubmit(out)}
			>
				<div class="grid grid-cols-5 content-start space-y-8 gap-x-2 px-8 pt-8">
					<TitleField
						of={form}
						class="col-span-2 row-start-1"
					/>

					<ReleaseTypeField
						of={form}
						class="col-span-1 row-start-2"
					/>

					<LocalizedTitlesField
						of={form}
						class="col-span-2 row-start-3"
					/>

					{(
						[
							{
								key: "release_date",
								label: t`Release date`,
								class: "row-start-4",
							},
							{
								key: "recording_date_start",
								label: t`Recording start`,
								class: "row-start-5",
							},
							{
								key: "recording_date_end",
								label: t`Recording end`,
								class: "row-start-6",
							},
						] as const
					).map((it) => {
						return (
							<div
								class={["col-span-3 grid grid-cols-subgrid", it.class].join(
									" ",
								)}
							>
								<FormComp.Label class="col-span-full">
									{it.label}
								</FormComp.Label>
								<DateWithPrecision
									setValue={(v) =>
										setInput(form, {
											path: ["data", it.key],
											// TODO: Upstream formisch error
											input: v ?? null,
										})
									}
								/>
								<For each={getErrors(form, { path: ["data", it.key] })}>
									{(error) => (
										<FormComp.ErrorMessage>{error}</FormComp.ErrorMessage>
									)}
								</For>
							</div>
						)
					})}

					<ReleaseArtistsField
						of={form}
						initArtists={props.type === "edit" ? props.release.artists : []}
						class="col-span-2 row-start-7"
					/>

					<ReleaseCatalogNumbersField
						of={form}
						initCatalogLabels={
							props.type === "edit"
								? (props.release.catalog_nums?.map((c) => c.label ?? undefined)
									?? [])
								: []
						}
						class="col-span-2 row-start-8"
					/>

					<ReleaseEventsField
						of={form}
						initEvents={props.type === "edit" ? props.release.events : []}
						class="col-span-2 row-start-9"
					/>

					<ReleaseTracksField
						of={form}
						initTracks={props.type === "edit" ? props.release.tracks : []}
						class="col-span-2 row-start-10"
					/>

					<ReleaseCreditsField
						of={form}
						initCredits={props.type === "edit" ? props.release.credits : []}
						class="col-span-2 row-start-11"
					/>

					<Field
						of={form}
						path={["description"]}
					>
						{(field) => (
							<InputField.Root class="col-span-3 row-start-12">
								<InputField.Label>{t`Correction Description`}</InputField.Label>
								<InputField.Textarea
									{...field.props}
									value={field.input ?? ""}
									class="min-h-32"
								/>

								<For each={field.errors}>
									{(error) => <InputField.Error>{error}</InputField.Error>}
								</For>
							</InputField.Root>
						)}
					</Field>
					<div></div>
				</div>
				<FormActionBar
					submitting={form.isSubmitting}
					class="mt-12"
					onSubmit={handleSubmitClick}
				/>
			</Form>
		</PendingCorrectionBoundary>
	)
}
