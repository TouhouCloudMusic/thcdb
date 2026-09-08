import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"

import * as ImageCropDialog from "~/component/ImageCropDialog"
import { formatBytes } from "~/component/ImageCropDialog/utils"
import type { FileSizeRange } from "~/component/ImageCropDialog/utils"
import { Button } from "~/component/atomic/button"
import { Image } from "~/component/image"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"

import type { ImageDimensionRange } from "./outputSize"
import { computeOutputSize } from "./outputSize"
import type { EntityImageUploadStore } from "./store"

const styles = stylex.create({
	backLink: {
		display: "inline-flex",
		maxWidth: "100%",
		alignItems: "center",
		gap: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: {
			default: colors.textSecondary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
	},
	eyebrow: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[8],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.1em",
		color: colors.textTertiary,
	},
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: 1.25,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	requirements: {
		display: "grid",
		gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
		width: "fit-content",
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textSecondary,
		columnGap: px[16],
		rowGap: px[8],
	},
	headerChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[16] },
	},
	actions: { display: "grid", alignContent: "flex-start", gap: px[12] },
	figureChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	previewBox: {
		display: "flex",
		aspectRatio: "1 / 1",
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundSecondary,
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	emptyPreview: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	previewImage: { width: "100%", height: "100%", objectFit: "cover" },
	caption: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	actionButton: { width: "100%", justifyContent: "center" },
	error: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.reimu[700],
	},
	queueLink: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		gap: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: {
			default: colors.textSecondary,
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
		},
	},
	page: { padding: px[32] },
	content: { width: "100%" },
	backLabel: { overflowWrap: "break-word" },
	eyebrowSeparator: { opacity: 0.4 },
	requirement: { display: "grid", gap: px[2] },
	requirementLabel: { letterSpacing: "0.1em", color: colors.textTertiary },
	requirementValue: { fontFamily: fonts.mono },
	comparison: {
		display: "grid",
		gap: px[24],
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 64rem)":
				"minmax(0,1fr) minmax(0,1fr) minmax(11rem,13rem)",
		},
	},
	currentFigure: { order: { default: 2, "@media (min-width: 64rem)": 1 } },
	draftFigure: { order: { default: 3, "@media (min-width: 64rem)": 2 } },
	uploadActions: {
		order: { default: 1, "@media (min-width: 64rem)": 3 },
		paddingTop: { default: null, "@media (min-width: 64rem)": px[28] },
	},
	cropCanvas: { height: px[384] },
	contentChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[24] },
	},
	headingChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
})

export { createEntityImageUploadStore } from "./store"

export type EntityImageUploadPageProps = {
	entityLabel: "Artist" | "Release"
	entityId: string
	entityName: string
	imageLabel: string
	imageUrl?: string | null
	dimensionRange: ImageDimensionRange
	fileSizeRange: FileSizeRange
	store: EntityImageUploadStore
}

function formatScaleRangePx(range: { min: number; max: number }) {
	return `${range.min}-${range.max}`
}

function formatDimensionRange(range: ImageDimensionRange) {
	return `${formatScaleRangePx(range.width)} × ${formatScaleRangePx(range.height)}`
}

function getBackLinkProps(
	entityLabel: EntityImageUploadPageProps["entityLabel"],
) {
	if (entityLabel === "Artist") {
		return { to: "/artist/$id" as const }
	}

	return { to: "/release/$id" as const }
}

type PreviewFigureProps = {
	label: string
	src?: string
	alt: string
	emptyText: string
	styles?: StyleXStyles
}

type PreviewBoxProps = Omit<PreviewFigureProps, "label">

function PreviewBox(props: PreviewBoxProps) {
	return (
		<div {...stylex.attrs(styles.previewBox, styles.figureChild)}>
			<Image.Root>
				<Image.Fallback>
					{(state) => (
						<Show when={!props.src || state !== Image.State.Loading}>
							<span {...stylex.attrs(styles.emptyPreview)}>
								{props.emptyText}
							</span>
						</Show>
					)}
				</Image.Fallback>
				<Image.Img
					src={props.src}
					alt={props.alt}
					styles={styles.previewImage}
				/>
			</Image.Root>
		</div>
	)
}

function PreviewFigure(props: PreviewFigureProps) {
	return (
		<figure {...stylex.attrs(props.styles)}>
			<figcaption {...stylex.attrs(styles.caption, styles.figureChild)}>
				{props.label}
			</figcaption>
			<PreviewBox
				src={props.src}
				alt={props.alt}
				emptyText={props.emptyText}
			/>
		</figure>
	)
}

type CurrentImageFigureProps = {
	entityName: string
	imageLabel: string
	src?: string
	styles?: StyleXStyles
}

function CurrentImageFigure(props: CurrentImageFigureProps) {
	const { t } = useLingui()
	return (
		<PreviewFigure
			label={t`Current`}
			src={props.src}
			alt={`${props.entityName} current ${props.imageLabel}`}
			emptyText={t`No image`}
			styles={props.styles}
		/>
	)
}

type ImageUploadActionsProps = {
	hasDraft: boolean
	isUploading: boolean
	submitError?: string
	onOpen: () => void
	onSubmit: () => Promise<void>
	styles?: StyleXStyles
}

function ImageUploadActions(props: ImageUploadActionsProps) {
	const { t } = useLingui()
	return (
		<section {...stylex.attrs(styles.actions, props.styles)}>
			<Button
				disabled={props.isUploading}
				onClick={props.onOpen}
				appearance="soft"
				tone="reimu"
				size="sm"
				styles={styles.actionButton}
			>
				{props.hasDraft ? t`Select another image` : t`Select image`}
			</Button>

			<Button
				disabled={!props.hasDraft || props.isUploading}
				onClick={() => {
					void props.onSubmit()
				}}
				appearance="solid"
				tone="reimu"
				size="sm"
				styles={styles.actionButton}
			>
				<Show
					when={props.isUploading}
					fallback={t`Submit`}
				>
					Uploading…
				</Show>
			</Button>

			<Show when={props.submitError}>
				{(error) => <div {...stylex.attrs(styles.error)}>{error()}</div>}
			</Show>

			<Link
				to="/image-queue"
				search={{ status: "pending" }}
				class={stylex.attrs(link.base, styles.queueLink).class}
			>
				<span>{t`Open image queue`}</span>
				<span aria-hidden="true">→</span>
			</Link>
		</section>
	)
}

export function EntityImageUploadPage(props: EntityImageUploadPageProps) {
	const { t } = useLingui()
	return (
		<PageLayout styles={styles.page}>
			<div {...stylex.attrs(styles.content)}>
				<header {...stylex.attrs(styles.contentChild)}>
					<Link
						to={getBackLinkProps(props.entityLabel).to}
						params={{ id: props.entityId }}
						class={
							stylex.attrs(link.base, styles.backLink, styles.headerChild).class
						}
					>
						<span aria-hidden="true">←</span>
						<span {...stylex.attrs(styles.backLabel)}>
							Back to {props.entityName}
						</span>
					</Link>

					<div {...stylex.attrs(styles.headerChild)}>
						<div {...stylex.attrs(styles.eyebrow, styles.headingChild)}>
							<span>{props.entityLabel.toUpperCase()}</span>
							<span
								aria-hidden="true"
								{...stylex.attrs(styles.eyebrowSeparator)}
							>
								/
							</span>
							<span>{props.imageLabel.toUpperCase()}</span>
						</div>
						<h1 {...stylex.attrs(styles.title, styles.headingChild)}>
							{props.entityName}
						</h1>
					</div>

					<div {...stylex.attrs(styles.requirements, styles.headerChild)}>
						<For
							each={[
								{
									label: t`Dimensions (px)`,
									value: formatDimensionRange(props.dimensionRange),
								},
								{
									label: t`File size`,
									value: `${formatBytes(props.fileSizeRange.min)}–${formatBytes(props.fileSizeRange.max)}`,
								},
								{
									label: t`Formats`,
									value: "PNG, JPEG",
								},
							]}
						>
							{(item) => (
								<div {...stylex.attrs(styles.requirement)}>
									<div {...stylex.attrs(styles.requirementLabel)}>
										{item.label}
									</div>
									<div {...stylex.attrs(styles.requirementValue)}>
										{item.value}
									</div>
								</div>
							)}
						</For>
					</div>
				</header>

				<article {...stylex.attrs(styles.comparison, styles.contentChild)}>
					<CurrentImageFigure
						entityName={props.entityName}
						imageLabel={props.imageLabel}
						src={imgUrl(props.imageUrl)}
						styles={styles.currentFigure}
					/>
					<PreviewFigure
						label={t`New`}
						src={props.store.draftPreviewUrl}
						alt={`${props.entityName} new ${props.imageLabel}`}
						emptyText={t`No image`}
						styles={styles.draftFigure}
					/>
					<ImageUploadActions
						hasDraft={props.store.hasDraft}
						isUploading={props.store.isUploading}
						submitError={props.store.submitError}
						onOpen={props.store.onOpen}
						onSubmit={props.store.onSubmit}
						styles={styles.uploadActions}
					/>
				</article>
			</div>

			<ImageCropDialog.Root
				open={props.store.isOpen}
				syncOpen={props.store.setIsOpen}
				fileSizeRange={props.fileSizeRange}
				computeOutputSize={(rawWidth: number, rawHeight: number) =>
					computeOutputSize(rawWidth, rawHeight, props.dimensionRange)
				}
				busy={props.store.isUploading}
				onSave={props.store.onDraftSave}
				title={`Edit ${props.imageLabel}`}
			>
				<ImageCropDialog.Canvas styles={styles.cropCanvas} />
			</ImageCropDialog.Root>
		</PageLayout>
	)
}
