import { Form, createForm, getAllErrors, getInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useBlocker } from "@tanstack/solid-router"
import type { Song } from "@thc/api"
import type { JSX } from "solid-js"
import { createEffect, Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { ExternalLinksField } from "~/component/form/ExternalLinksField"
import { NewSongCorrection } from "~/domain/song"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { SongArtistsField } from "./comp/SongArtistsField"
import { SongCreditsField } from "./comp/SongCreditsField"
import { SongLanguagesField } from "./comp/SongLanguagesField"
import { SongLocalizedTitlesField } from "./comp/SongLocalizedTitlesField"
import { SongRelationsField } from "./comp/SongRelationsField"
import { SongTitleField } from "./comp/SongTitleField"
import { useSongFormInitialValues } from "./hook/useFormInitialValues"
import { useSongFormSubmission } from "./hook/useFormSubmission"

const styles = stylex.create({
	fieldSpacing: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[32] },
	},
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
	pageTitle: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
	},
	fields: {
		display: "grid",
		gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
		alignContent: "flex-start",
		columnGap: px[8],
		paddingInline: px[32],
		paddingTop: px[32],
	},
	titleField: {
		gridColumn: "span 2 / span 2",
		gridRowStart: "1",
	},
	artistsField: {
		gridColumn: "span 2 / span 2",
		gridRowStart: "2",
	},
	languagesField: {
		gridColumn: "span 2 / span 2",
		gridRowStart: "3",
	},
	localizedTitlesField: {
		gridColumn: "span 2 / span 2",
		gridRowStart: "4",
	},
	creditsField: {
		gridColumn: "span 2 / span 2",
		gridRowStart: "5",
	},
	linksField: {
		gridColumn: "span 2 / span 2",
		gridRowStart: "6",
	},
	relationsField: {
		gridColumn: "span 3 / span 3",
		gridRow: "span 5 / span 5",
		gridRowStart: "2",
	},
})

type Props =
	| { type: "new" }
	| { type: "edit"; song: Song; pendingCorrectionId?: number }

export function EditSongPage(props: Props): JSX.Element {
	return (
		<PageLayout styles={[styles.page]}>
			<PageHeader type={props.type} />
			<FormContent {...props} />
		</PageLayout>
	)
}

function PageHeader(props: { type: Props["type"] }) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.pageHeader)}>
			<div {...stylex.attrs(styles.headerContent)}>
				<h1 {...stylex.attrs(styles.pageTitle)}>
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
				<div {...stylex.attrs(styles.fields)}>
					<SongTitleField
						of={form}
						styles={[styles.titleField, styles.fieldSpacing]}
					/>

					<SongArtistsField
						of={form}
						initArtists={
							props.type === "edit" ? (props.song.artists ?? []) : []
						}
						styles={[styles.artistsField, styles.fieldSpacing]}
					/>

					<SongLanguagesField
						of={form}
						initLanguages={
							props.type === "edit" ? (props.song.languages ?? []) : []
						}
						styles={[styles.languagesField, styles.fieldSpacing]}
					/>

					<SongLocalizedTitlesField
						of={form}
						initLocalizedTitles={
							props.type === "edit" ? (props.song.localized_titles ?? []) : []
						}
						styles={[styles.localizedTitlesField, styles.fieldSpacing]}
					/>

					<SongCreditsField
						of={form}
						initCredits={
							props.type === "edit" ? (props.song.credits ?? []) : []
						}
						styles={[styles.creditsField, styles.fieldSpacing]}
					/>

					<ExternalLinksField
						of={form}
						styles={[styles.linksField, styles.fieldSpacing]}
					/>

					<SongRelationsField
						of={form}
						currentSongId={props.type === "edit" ? props.song.id : undefined}
						initRelations={
							props.type === "edit" ? (props.song.relations ?? []) : []
						}
						styles={[styles.relationsField, styles.fieldSpacing]}
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
