import { Form, createForm, getDeepErrors, getInput } from "@formisch/solid"
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useBlocker } from "@tanstack/solid-router"
import type { Song } from "@thc/api"
import type { JSX } from "solid-js"
import { createEffect, Show } from "solid-js"

import { FormActionBar } from "~/component/form"
import { ExternalLinksField } from "~/component/form/ExternalLinksField"
import { useArrayField } from "~/component/form/useArrayField"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"
import * as typography from "~/style/typography"
import { PendingCorrectionBoundary } from "~/view/correction/pendingCorrection"

import { SongArtistsField } from "./comp/SongArtistsField"
import { SongCreditsField } from "./comp/SongCreditsField"
import { SongLanguagesField } from "./comp/SongLanguagesField"
import { SongLocalizedTitlesField } from "./comp/SongLocalizedTitlesField"
import { SongRelationsField } from "./comp/SongRelationsField"
import { SongTitleField } from "./comp/SongTitleField"
import { useSongFormInitialValues } from "./hook/useFormInitialValues"
import { useSongFormSubmission } from "./hook/useFormSubmission"
import { SongFormSchema } from "./schema"

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
				<h1 {...stylex.attrs(typography.heading.md)}>
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
		schema: SongFormSchema,
		initialInput: initialValues,
	})

	const links = useArrayField(form, { path: ["data", "links"] })

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
				onSubmit={handleSubmit}
			>
				<div {...stylex.attrs(styles.fields)}>
					<SongTitleField
						of={form}
						styles={[styles.titleField, styles.fieldSpacing]}
					/>

					<SongArtistsField
						of={form}
						styles={[styles.artistsField, styles.fieldSpacing]}
					/>

					<SongLanguagesField
						of={form}
						styles={[styles.languagesField, styles.fieldSpacing]}
					/>

					<SongLocalizedTitlesField
						of={form}
						styles={[styles.localizedTitlesField, styles.fieldSpacing]}
					/>

					<SongCreditsField
						of={form}
						styles={[styles.creditsField, styles.fieldSpacing]}
					/>

					<ExternalLinksField
						field={links}
						styles={[styles.linksField, styles.fieldSpacing]}
					/>

					<SongRelationsField
						of={form}
						currentSongId={props.type === "edit" ? props.song.id : undefined}
						styles={[styles.relationsField, styles.fieldSpacing]}
					/>
				</div>
				<FormActionBar
					submitting={form.isSubmitting}
					onSubmit={() => {
						if (import.meta.env.DEV) {
							const errs = getDeepErrors(form)
							console.log(errs)
						}
					}}
				/>
			</Form>
		</PendingCorrectionBoundary>
	)
}
