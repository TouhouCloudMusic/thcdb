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
import * as stylex from "@stylexjs/stylex"
import { useBlocker } from "@tanstack/solid-router"
import type { Release } from "@thc/api"
import type { JSX } from "solid-js"
import { createEffect, For, Show } from "solid-js"

import { FormComp } from "~/component/atomic/form"
import { InputField } from "~/component/atomic/form/Input"
import { FormActionBar } from "~/component/form"
import { DateWithPrecision } from "~/component/form/DateWithPrecision"
import { ExternalLinksField } from "~/component/form/ExternalLinksField"
import { NewReleaseCorrection as NewReleaseCorrectionSchema } from "~/domain/release"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { formStyles } from "~/style/primitives"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
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

const styles = stylex.create({
	dateField: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridColumn: "span 3 / span 3",
	},
	releaseDate: { gridRowStart: "4" },
	recordingStart: { gridRowStart: "5" },
	recordingEnd: { gridRowStart: "6" },
	page: { display: "grid", gridTemplateRows: "auto 1fr auto" },
	header: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		padding: px[32],
	},
	headerContent: { display: "flex", alignItems: "center", gap: px[16] },
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
	},
	form: {
		display: "grid",
		gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
		alignContent: "flex-start",
		columnGap: px[8],
		paddingInline: px[32],
		paddingTop: px[32],
		paddingBottom: px[32],
		rowGap: px[32],
	},
	titleField: { gridColumn: "span 2 / span 2", gridRowStart: "1" },
	typeField: { gridColumn: "span 1 / span 1", gridRowStart: "2" },
	localizedTitlesField: { gridColumn: "span 2 / span 2", gridRowStart: "3" },
	dateLabel: { gridColumn: "1 / -1" },
	artistsField: { gridColumn: "span 2 / span 2", gridRowStart: "7" },
	catalogsField: {
		gridColumn: "span 2 / span 2",
		gridRowStart: "8",
	},
	eventsField: { gridColumn: "span 2 / span 2", gridRowStart: "9" },
	tracksField: { gridColumn: "span 2 / span 2", gridRowStart: "10" },
	creditsField: { gridColumn: "span 2 / span 2", gridRowStart: "11" },
	linksField: { gridColumn: "span 2 / span 2", gridRowStart: "12" },
	correctionField: { gridColumn: "span 3 / span 3", gridRowStart: "13" },
	correctionInput: { minHeight: px[128] },
	actions: { marginTop: px[48] },
})

type Props =
	| { type: "new" }
	| { type: "edit"; release: Release; pendingCorrectionId?: number }

export function EditReleasePage(props: Props): JSX.Element {
	return (
		<PageLayout styles={styles.page}>
			<PageHeader type={props.type} />
			<FormContent {...props} />
		</PageLayout>
	)
}

function PageHeader(props: { type: Props["type"] }) {
	const { t } = useLingui()
	return (
		<div {...stylex.attrs(styles.header)}>
			<div {...stylex.attrs(styles.headerContent)}>
				<h1 {...stylex.attrs(styles.title)}>
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
				<div {...stylex.attrs(styles.form)}>
					<TitleField
						of={form}
						styles={styles.titleField}
					/>

					<ReleaseTypeField
						of={form}
						styles={styles.typeField}
					/>

					<LocalizedTitlesField
						of={form}
						styles={styles.localizedTitlesField}
					/>

					{(
						[
							{
								key: "release_date",
								label: t`Release date`,
								styles: styles.releaseDate,
							},
							{
								key: "recording_date_start",
								label: t`Recording start`,
								styles: styles.recordingStart,
							},
							{
								key: "recording_date_end",
								label: t`Recording end`,
								styles: styles.recordingEnd,
							},
						] as const
					).map((it) => {
						return (
							<div {...stylex.attrs(styles.dateField, it.styles)}>
								<label {...stylex.attrs(formStyles.label, styles.dateLabel)}>
									{it.label}
								</label>
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
						styles={styles.artistsField}
					/>

					<ReleaseCatalogNumbersField
						of={form}
						initCatalogLabels={
							props.type === "edit"
								? (props.release.catalog_nums?.map((c) => c.label ?? undefined)
									?? [])
								: []
						}
						styles={styles.catalogsField}
					/>

					<ReleaseEventsField
						of={form}
						initEvents={props.type === "edit" ? props.release.events : []}
						styles={styles.eventsField}
					/>

					<ReleaseTracksField
						of={form}
						initTracks={props.type === "edit" ? props.release.tracks : []}
						styles={styles.tracksField}
					/>

					<ReleaseCreditsField
						of={form}
						initCredits={props.type === "edit" ? props.release.credits : []}
						styles={styles.creditsField}
					/>

					<ExternalLinksField
						of={form}
						styles={styles.linksField}
					/>

					<Field
						of={form}
						path={["description"]}
					>
						{(field) => (
							<InputField.Root styles={styles.correctionField}>
								<InputField.Label>{t`Correction Description`}</InputField.Label>
								<InputField.Textarea
									{...field.props}
									value={field.input ?? ""}
									styles={styles.correctionInput}
								/>

								<For each={field.errors}>
									{(error) => <InputField.Error>{error}</InputField.Error>}
								</For>
							</InputField.Root>
						)}
					</Field>
				</div>
				<FormActionBar
					submitting={form.isSubmitting}
					styles={styles.actions}
					onSubmit={handleSubmitClick}
				/>
			</Form>
		</PendingCorrectionBoundary>
	)
}
