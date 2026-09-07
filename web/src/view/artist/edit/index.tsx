import { Form, createForm } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useBlocker } from "@tanstack/solid-router"
import type { Artist } from "@thc/api"
import { ArrowLeftIcon } from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { Show, Suspense } from "solid-js"

import { Button } from "~/component/atomic/button"
import { FormActionBar } from "~/component/form"
import { ExternalLinksField } from "~/component/form/ExternalLinksField"
import { NewArtistCorrection } from "~/domain/artist/schema"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { ArtistFormAliasesField } from "./comp/Aliases"
import { ArtistFormNameField } from "./comp/ArtistName"
import { ArtistFormArtistTypeField } from "./comp/ArtistType"
import { ArtistFormDateFields } from "./comp/Date"
import { ArtistFormActions } from "./comp/FormActions"
import { ArtistFormLocalizedNames } from "./comp/LocalizedNames"
import { ArtistFormLocationFields } from "./comp/Locations"
import { ArtistFormMembership } from "./comp/Membership"
import { ArtistFormTextAliases } from "./comp/TextAliases"
import { ArtistFormProvider } from "./context"
import { useArtistFormInitialValues } from "./hook/useFormInitialValues"
import { useArtistFormSubmission } from "./hook/useFormSubmission"

const styles = stylex.create({
	page: {
		display: "grid",
		gridTemplateRows: "auto 1fr auto",
	},
	pageHeader: {
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		padding: px[32],
	},
	headerContent: {
		display: "flex",
		alignItems: "center",
		gap: px[16],
	},
	backButton: {
		width: px[24],
		height: px[24],
		padding: 0,
	},
	backIcon: {
		width: px[24],
		height: px[24],
	},
	pageTitle: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
	},
	form: {
		display: "flex",
		flexGrow: 1,
		flexDirection: "column",
	},
	fields: {
		display: "flex",
		flexDirection: "column",
		padding: px[32],
		paddingBottom: 0,
		rowGap: px[32],
	},
	field: {
		width: px[384],
	},
})

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
		<PageLayout styles={[styles.page]}>
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
		<div {...stylex.attrs(styles.pageHeader)}>
			<div {...stylex.attrs(styles.headerContent)}>
				<Button
					onClick={() => {
						history.back()
					}}
					appearance="ghost"
					tone="gray"
					size="sm"
					styles={styles.backButton}
				>
					<ArrowLeftIcon {...stylex.attrs(styles.backIcon)} />
				</Button>
				<h1 {...stylex.attrs(styles.pageTitle)}>
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
					{...stylex.attrs(styles.form)}
					// TODO: Temporary workaround for upstream type defs; refactor once the library fixes its typing bug.
					onSubmit={(output, _) => handleSubmit(output)}
				>
					<div {...stylex.attrs(styles.fields)}>
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

						<ExternalLinksField
							of={form}
							styles={styles.field}
						/>

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
