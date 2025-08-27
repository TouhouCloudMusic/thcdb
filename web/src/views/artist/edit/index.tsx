/* @refresh reload */
import { Trans, useLingui } from "@lingui-solid/solid/macro"
import * as M from "@modular-forms/solid"
import { createForm } from "@modular-forms/solid"
import { useBlocker } from "@tanstack/solid-router"
import type { Artist } from "@thc/api"
import type { JSX } from "solid-js"
import { Show, Suspense } from "solid-js"
import { ArrowLeftIcon } from "solid-radix-icons"

import { Button } from "~/components/atomic/button"
import { NewArtistCorrection } from "~/domain/artist/schema"
import { PageLayout } from "~/layout/PageLayout"

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
	  }

export function EditArtistPage(props: Props): JSX.Element {
	return (
		<PageLayout class="grid grid-rows-[auto_1fr_auto]">
			<PageHeader type={props.type} />
			<Suspense
				fallback={
					<div>
						<Trans>Loading...</Trans>
					</div>
				}
			>
				<Form {...props} />
			</Suspense>
		</PageLayout>
	)
}

function PageHeader(props: { type: Props["type"] }) {
	return (
		<div class="border-b-1 border-slate-300 p-8">
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
						fallback={<Trans>Edit Artist</Trans>}
					>
						<Trans>Create Artist</Trans>
					</Show>
				</h1>
			</div>
		</div>
	)
}

function Form(props: Props) {
	const { t } = useLingui()
	const initialValues = useArtistFormInitialValues(props)
	const { handleSubmit, mutation } = useArtistFormSubmission(props)

	const [formStore, { Form }] = createForm<NewArtistCorrection>({
		validate: M.valiForm(NewArtistCorrection),
		initialValues,
	})

	useBlocker({
		shouldBlockFn() {
			if (!formStore.dirty) {
				return false
			}

			const msg = confirm(
				t`Are you sure you want to leave this page? Your changes will be lost.`,
			)

			// bro confirmation = unblock...
			return !msg
		},
	})

	return (
		<ArtistFormProvider
			value={{
				get artistId() {
					if (props.type == "edit") {
						return props.artist.id
					}
				},
				formStore,
			}}
		>
			<Form
				class="flex grow flex-col space-y-8 px-8 pt-8"
				shouldActive={false}
				onSubmit={handleSubmit}
			>
				<ArtistFormNameField />

				<ArtistFormArtistTypeField />

				<ArtistFormLocalizedNames />

				<ArtistFormAliasesField />

				<ArtistFormTextAliases />

				<ArtistFormDateFields />

				<ArtistFormLocationFields />

				<ArtistFormMembership />

				<ArtistFormLinks />

				<ArtistFormActions mutation={mutation} />
			</Form>
		</ArtistFormProvider>
	)
}
