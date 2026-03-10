import { For, Show } from "solid-js"
import { twJoin } from "tailwind-merge"

import * as ImageCropDialog from "~/component/ImageCropDialog"
import { formatBytes } from "~/component/ImageCropDialog/utils"
import type { FileSizeRange } from "~/component/ImageCropDialog/utils"
import { Link } from "~/component/atomic"
import { Button } from "~/component/atomic/button"
import { Image } from "~/component/image"
import { PageLayout } from "~/layout/PageLayout"
import { imgUrl } from "~/utils/adapter/static_file"

import type { ImageDimensionRange } from "./outputSize"
import { computeOutputSize } from "./outputSize"
import type { EntityImageUploadStore } from "./store"

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
	class?: string
}

type PreviewBoxProps = Omit<PreviewFigureProps, "label">

function PreviewBox(props: PreviewBoxProps) {
	return (
		<div class="flex aspect-square items-center justify-center overflow-hidden rounded-sm border border-slate-300 bg-secondary shadow-xs">
			<Image.Root>
				<Image.Fallback>
					{(state) => (
						<Show when={!props.src || state !== Image.State.Loading}>
							<span class="text-sm text-slate-500">{props.emptyText}</span>
						</Show>
					)}
				</Image.Fallback>
				<Image.Img
					src={props.src}
					alt={props.alt}
					class="size-full object-cover"
				/>
			</Image.Root>
		</div>
	)
}

function PreviewFigure(props: PreviewFigureProps) {
	return (
		<figure class={twJoin("space-y-2", props.class)}>
			<figcaption class="text-sm text-secondary">{props.label}</figcaption>
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
	class?: string
}

function CurrentImageFigure(props: CurrentImageFigureProps) {
	return (
		<PreviewFigure
			label="Current"
			src={props.src}
			alt={`${props.entityName} current ${props.imageLabel}`}
			emptyText="No image"
			class={props.class}
		/>
	)
}

type ImageUploadActionsProps = {
	hasDraft: boolean
	isUploading: boolean
	submitError?: string
	onOpen: () => void
	onSubmit: () => Promise<void>
	class?: string
}

function getSelectImageButtonLabel(hasDraft: boolean) {
	return hasDraft ? "Select another image" : "Select image"
}

function ImageUploadActions(props: ImageUploadActionsProps) {
	return (
		<section class={twJoin("grid content-start gap-3", props.class)}>
			<Button
				variant="Secondary"
				color="Reimu"
				size="Sm"
				class="w-full justify-center"
				disabled={props.isUploading}
				onClick={props.onOpen}
			>
				{getSelectImageButtonLabel(props.hasDraft)}
			</Button>

			<Button
				variant="Primary"
				color="Reimu"
				size="Sm"
				class="w-full justify-center"
				disabled={!props.hasDraft || props.isUploading}
				onClick={() => {
					void props.onSubmit()
				}}
			>
				<Show
					when={props.isUploading}
					fallback="Submit"
				>
					Uploading…
				</Show>
			</Button>

			<Show when={props.submitError}>
				{(error) => <div class="text-sm text-reimu-700">{error()}</div>}
			</Show>

			<Link
				to="/image-queue"
				search={{ status: "pending" }}
				underline={false}
				class="inline-flex items-center justify-center gap-2 text-sm text-secondary hover:text-primary"
			>
				<span>Open image queue</span>
				<span aria-hidden="true">→</span>
			</Link>
		</section>
	)
}

export function EntityImageUploadPage(props: EntityImageUploadPageProps) {
	return (
		<PageLayout class="p-4">
			<div class="w-full space-y-6">
				<header class="space-y-4">
					<Link
						to={getBackLinkProps(props.entityLabel).to}
						params={{ id: props.entityId }}
						underline={false}
						class="inline-flex max-w-full items-center gap-2 text-sm text-secondary hover:text-primary"
					>
						<span aria-hidden="true">←</span>
						<span class="wrap-break-word">Back to {props.entityName}</span>
					</Link>

					<div class="space-y-2">
						<div class="flex flex-wrap items-center gap-2 text-xs font-medium tracking-widest text-tertiary">
							<span>{props.entityLabel.toUpperCase()}</span>
							<span
								aria-hidden="true"
								class="opacity-40"
							>
								/
							</span>
							<span>{props.imageLabel.toUpperCase()}</span>
						</div>
						<h1 class="text-2xl leading-tight font-light tracking-tight text-primary">
							{props.entityName}
						</h1>
					</div>

					<div class="grid grid-cols-3 w-fit gap-x-4 gap-y-2 text-xs text-secondary">
						<For
							each={[
								{
									label: "Dimensions (px)",
									value: formatDimensionRange(props.dimensionRange),
								},
								{
									label: "File size",
									value: `${formatBytes(props.fileSizeRange.min)}–${formatBytes(props.fileSizeRange.max)}`,
								},
								{
									label: "Formats",
									value: "PNG, JPEG",
								},
							]}
						>
							{(item) => (
								<div class="grid gap-0.5">
									<div class="tracking-widest text-tertiary">{item.label}</div>
									<div class="font-mono">{item.value}</div>
								</div>
							)}
						</For>
					</div>
				</header>

				<article class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(11rem,13rem)]">
					<CurrentImageFigure
						entityName={props.entityName}
						imageLabel={props.imageLabel}
						src={imgUrl(props.imageUrl)}
						class="order-2 lg:order-1"
					/>
					<PreviewFigure
						label="New"
						src={props.store.draftPreviewUrl}
						alt={`${props.entityName} new ${props.imageLabel}`}
						emptyText="No image"
						class="order-3 lg:order-2"
					/>
					<ImageUploadActions
						hasDraft={props.store.hasDraft}
						isUploading={props.store.isUploading}
						submitError={props.store.submitError}
						onOpen={props.store.onOpen}
						onSubmit={props.store.onSubmit}
						class="order-1 lg:order-3 lg:pt-7"
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
				<ImageCropDialog.Canvas class="h-96" />
			</ImageCropDialog.Root>
		</PageLayout>
	)
}
