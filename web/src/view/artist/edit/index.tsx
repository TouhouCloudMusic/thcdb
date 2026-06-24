import { Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import { useBlocker } from "@tanstack/solid-router"
import type { Artist } from "@thc/api"
import type { JSX } from "solid-js"
import { Show, Suspense } from "solid-js"
import { ArrowLeftIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { FormActionBar } from "~/component/form"
import { NewArtistCorrection } from "~/domain/artist/schema"
import { PageLayout } from "~/layout/PageLayout"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { ArtistFormAliasesField } from "./comp/Aliases"
import { ArtistFormNameField } from "./comp/ArtistName"
import { ArtistFormArtistTypeField } from "./comp/ArtistType"
import { ArtistFormDateFields } from "./comp/Date"
import { ArtistFormActions } from "./comp/FormActions"
import { ArtistFormLinks } from "./comp/Links"
import { ArtistFormLocalizedNames } from "./comp/LocalizedNames"
import { ArtistFormLocationFields } from "./comp/Locations"
import { ArtistFormMembership } from "./comp/Membership"
import { ArtistFormTextAliases } from "./comp/TextAliases"
import { ArtistFormProvider } from "./context"
import { useArtistFormInitialValues } from "./hook/useFormInitialValues"
import { useArtistFormSubmission } from "./hook/useFormSubmission"

type Props =
	| {
			type: "new"
	  }
	| {
			type: "edit"
			artist: Artist
			pendingCorrectionId?: number
	  }

export function EditArtistPage(props: Props): JSX.Element {
	const { t } = useLingui()
	return (
		<PageLayout class="grid grid-rows-[auto_1fr_auto]">
			<PageHeader type={props.type} />
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<FormContent {...props} />
			</Suspense>
		</PageLayout>
	)
}

function PageHeader(props: { type: Props["type"] }) {
	const { t } = useLingui()
	return (
		<div class="border-b border-slate-300 p-8">
			<div class="flex items-center gap-4">
				<Button
					class="size-6 p-0"
					variant="Tertiary"
					size="Sm"
					onClick={() => {
						history.back()
					}}
				>
					<ArrowLeftIcon class="size-6" />
				</Button>
				<h1 class="text-2xl font-light">
					<Show
						when={props.type === "new"}
						fallback={t`Edit Artist`}
					>
						{t`Create Artist`}
					</Show>
				</h1>
			</div>
		</div>
	)
}

function FormContent(props: Props) {
	const { t } = useLingui()
	const initialValues = useArtistFormInitialValues(props)
	const { handleSubmit, mutation, pendingCorrectionId } =
		useArtistFormSubmission(props)

	const form = createForm({
		schema: NewArtistCorrection,
		initialInput: initialValues,
	})
	const isSubmitting = () => mutation.isPending || form.isSubmitting

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
			<ArtistFormProvider
				value={{
					get artistId() {
						if (props.type == "edit") {
							return props.artist.id
						}
					},
					formStore: form,
				}}
			>
				<Form
					of={form}
					class="flex grow flex-col"
					// TODO: Temporary workaround for upstream type defs; refactor once the library fixes its typing bug.
					onSubmit={(output, _) => handleSubmit(output)}
				>
					<div class="flex flex-col space-y-8 p-8 pb-0">
						<ArtistFormNameField />

						<ArtistFormArtistTypeField />

						<ArtistFormLocalizedNames />

						<ArtistFormAliasesField
							initAliasIds={props.type === "edit" ? props.artist.aliases : []}
						/>

						<ArtistFormTextAliases />

						<ArtistFormDateFields />

						<ArtistFormLocationFields />

						<ArtistFormMembership
							initMemberships={
								props.type === "edit" ? props.artist.memberships : []
							}
						/>

						<ArtistFormLinks />

						<ArtistFormActions mutation={mutation} />
					</div>
					<FormActionBar
						submitting={isSubmitting()}
						disabled={isSubmitting()}
					/>
				</Form>
			</ArtistFormProvider>
		</PendingCorrectionBoundary>
	)
}
