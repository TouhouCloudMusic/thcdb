import { Form, createForm, getAllErrors, getInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { useBlocker } from "@tanstack/solid-router"
import type { Song } from "@thc/api"
import type { JSX } from "solid-js"
import { createEffect, Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { NewSongCorrection } from "~/domain/song"
import { PageLayout } from "~/layout/PageLayout"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { SongArtistsField } from "./comp/SongArtistsField"
import { SongCreditsField } from "./comp/SongCreditsField"
import { SongLanguagesField } from "./comp/SongLanguagesField"
import { SongLocalizedTitlesField } from "./comp/SongLocalizedTitlesField"
import { SongRelationsField } from "./comp/SongRelationsField"
import { SongTitleField } from "./comp/SongTitleField"
import { useSongFormInitialValues } from "./hook/useFormInitialValues"
import { useSongFormSubmission } from "./hook/useFormSubmission"

type Props =
	| { type: "new" }
	| { type: "edit"; song: Song; pendingCorrectionId?: number }

export function EditSongPage(props: Props): JSX.Element {
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
						fallback={<>{t`Edit Song`}</>}
					>
						Create Song
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = useSongFormInitialValues(props)

	const form = createForm({
		schema: NewSongCorrection,
		initialInput: initialValues,
	})

	if (import.meta.env.DEV) {
		createEffect(() => {
			const val = getInput(form)
			console.log(val)
		})
	}

	const { handleSubmit, pendingCorrectionId } = useSongFormSubmission(props)

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
					<SongTitleField
						of={form}
						class="col-span-2 row-start-1"
					/>

					<SongArtistsField
						of={form}
						initArtists={
							props.type === "edit" ? (props.song.artists ?? []) : []
						}
						class="col-span-2 row-start-2"
					/>

					<SongLanguagesField
						of={form}
						initLanguages={
							props.type === "edit" ? (props.song.languages ?? []) : []
						}
						class="col-span-2 row-start-3"
					/>

					<SongLocalizedTitlesField
						of={form}
						initLocalizedTitles={
							props.type === "edit" ? (props.song.localized_titles ?? []) : []
						}
						class="col-span-2 row-start-4"
					/>

					<SongCreditsField
						of={form}
						initCredits={
							props.type === "edit" ? (props.song.credits ?? []) : []
						}
						class="col-span-2 row-start-5"
					/>

					<SongRelationsField
						of={form}
						currentSongId={props.type === "edit" ? props.song.id : undefined}
						initRelations={
							props.type === "edit" ? (props.song.relations ?? []) : []
						}
						class="col-span-3 row-start-2 row-span-4"
					/>
				</div>
				<FormActionBar
					submitting={form.isSubmitting}
					onSubmit={() => {
						if (import.meta.env.DEV) {
							const errs = getAllErrors(form)
							console.log(errs)
						}
					}}
				/>
			</Form>
		</PendingCorrectionBoundary>
	)
}
