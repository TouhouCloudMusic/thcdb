import { useQuery, useQueryClient } from "@tanstack/solid-query"
import type { ImageQueueDetail, ImageQueueStatus } from "@thc/api"
import {
	ArtistQueryOption,
	ImageQueueMutation,
	ImageQueueQueryOption,
	ReleaseQueryOption,
} from "@thc/query"
import { ObjExt } from "@thc/toolkit/data"
import { Option as O } from "effect"
import { createMemo, createSignal, Match, Show, Switch } from "solid-js"
import type { JSX } from "solid-js"

import { Badge } from "~/component/atomic/Badge"
import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import { Image } from "~/component/image"
import { PageLayout } from "~/layout"
import { useCurrentUser } from "~/state/user"
import { imgUrl } from "~/utils/adapter/static_file"

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

const LABEL_CLASS = "text-xs text-tertiary"

function statusTone(status: ImageQueueStatus) {
	switch (status) {
		case "Pending": {
			return { color: "Marisa", label: "Pending" } as const
		}
		case "Approved": {
			return { color: "Green", label: "Approved" } as const
		}
		case "Rejected": {
			return { color: "Reimu", label: "Rejected" } as const
		}
		case "Cancelled": {
			return { color: "Slate", label: "Cancelled" } as const
		}
		case "Reverted": {
			return { color: "Blue", label: "Reverted" } as const
		}
		default: {
			return { color: "Slate", label: "Unknown" } as const
		}
	}
}

function formatDateTime(value: string | null | undefined) {
	if (!value) return "—"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return DATE_TIME.format(date)
}

function imagePath(detail: ImageQueueDetail) {
	const image = detail.image
	if (!image) return
	const dir = image.directory.replaceAll(/\/+$/g, "")
	if (!dir) return image.filename
	return `${dir}/${image.filename}`
}

function getTargetMeta(detail: ImageQueueDetail) {
	if (detail.artist) {
		return {
			label: "Artist",
			id: detail.artist.artist_id,
			type: detail.artist.type,
			imageLabel: "profile image",
			to: "/artist/$id" as const,
		}
	}

	if (detail.release) {
		return {
			label: "Release",
			id: detail.release.release_id,
			type: detail.release.type,
			imageLabel: "cover image",
			to: "/release/$id" as const,
		}
	}
}

function hasImageQueueManagePermission(
	roles: { name: string }[] | null | undefined,
) {
	return (
		roles?.some((role) => role.name === "Admin" || role.name === "Moderator")
		?? false
	)
}

type Props = {
	entryId: number
}

export type ImageQueueDetailPageContentProps = {
	detail?: ImageQueueDetail
	isLoading: boolean
	isError: boolean
	canManage: boolean
	isBusy: boolean
	mutationErrorMessage?: string
	backLink:
		| {
				to: "/image-queue"
				search: { status: "pending" }
		  }
		| {
				to: "/user/$id/image-queue"
				params: { id: string }
		  }
	onApprove: () => void
	onReject: () => void
	onRevert: () => void
	cachedNeighbor?: {
		prev?: number
		next?: number
	}
	targetName?: string
	currentSrc?: string
	currentLoading: boolean
	currentError: boolean
}

function extractInfiniteQueryIds(data: unknown): number[] {
	if (!ObjExt.isRecord(data)) return []

	const pages = data["pages"]
	if (!Array.isArray(pages)) return []

	const ids: number[] = []
	for (const page of pages) {
		if (!ObjExt.isRecord(page)) continue
		const items = page["items"]
		if (!Array.isArray(items)) continue

		for (const item of items) {
			if (!ObjExt.isRecord(item)) continue
			const id = item["id"]
			if (typeof id === "number") ids.push(id)
		}
	}

	return ids
}

export function ImageQueueDetailPage(props: Props) {
	const queryClient = useQueryClient()
	const userCtx = useCurrentUser()
	const detailQuery = useQuery(() =>
		ImageQueueQueryOption.detail(props.entryId),
	)
	const mutation = ImageQueueMutation.getHandleInstance()
	const canManage = createMemo(() =>
		hasImageQueueManagePermission(userCtx.user?.roles),
	)

	const detail = createMemo(() => detailQuery.data)
	const targetInfo = useTargetInfo(() => detail())

	const backLink = createMemo<ImageQueueDetailPageContentProps["backLink"]>(
		() => {
			const userId = detail()?.created_by.id
			if (!canManage() && userId !== undefined) {
				return {
					to: "/user/$id/image-queue",
					params: { id: userId.toString() },
				}
			}

			return { to: "/image-queue", search: { status: "pending" } }
		},
	)

	const refresh = () => {
		void queryClient.invalidateQueries({ queryKey: ["image-queue::detail"] })
		void queryClient.invalidateQueries({ queryKey: ["image-queue::list"] })
		void queryClient.invalidateQueries({
			queryKey: ["image-queue::pending-count"],
		})
		void queryClient.invalidateQueries({ queryKey: ["image-queue::user"] })

		const artistId = detail()?.artist?.artist_id
		if (artistId !== undefined) {
			void queryClient.invalidateQueries({
				queryKey: ["artist::profile", artistId],
			})
		}

		const releaseId = detail()?.release?.release_id
		if (releaseId !== undefined) {
			void queryClient.invalidateQueries({
				queryKey: ["release::info", releaseId],
			})
		}
	}

	const handle = (method: "Approve" | "Reject" | "Revert") => {
		mutation.mutate(
			{ id: props.entryId, method },
			{
				onSuccess: () => {
					refresh()
				},
			},
		)
	}

	const mutationErrorMessage = createMemo(() => {
		if (!mutation.isError) return
		const error = mutation.error
		if (error instanceof Error) {
			return error.message || "Request failed."
		}
		return "Request failed."
	})

	const cachedNeighbor = createMemo(() => {
		const ids = [
			...queryClient
				.getQueriesData({ queryKey: ["image-queue::list"] })
				.flatMap(([, data]) => extractInfiniteQueryIds(data)),
			...queryClient
				.getQueriesData({ queryKey: ["image-queue::user"] })
				.flatMap(([, data]) => extractInfiniteQueryIds(data)),
		]

		const unique = Array.from(new Set(ids)).toSorted((a, b) => b - a)
		const index = unique.indexOf(props.entryId)
		if (index === -1) return

		return {
			prev: unique[index - 1],
			next: unique[index + 1],
		}
	})

	return (
		<ImageQueueDetailPageContent
			detail={detail()}
			isLoading={detailQuery.isLoading}
			isError={detailQuery.isError}
			canManage={canManage()}
			isBusy={mutation.isPending}
			mutationErrorMessage={mutationErrorMessage()}
			backLink={backLink()}
			onApprove={() => handle("Approve")}
			onReject={() => handle("Reject")}
			onRevert={() => handle("Revert")}
			cachedNeighbor={cachedNeighbor()}
			targetName={targetInfo.name()}
			currentSrc={targetInfo.currentSrc()}
			currentLoading={targetInfo.currentLoading()}
			currentError={targetInfo.currentError()}
		/>
	)
}

export function ImageQueueDetailPageContent(
	props: ImageQueueDetailPageContentProps,
) {
	const surfaceCardClass =
		"rounded-sm border border-slate-300 bg-primary shadow-xs"
	const tone = () =>
		props.detail ? statusTone(props.detail.status) : statusTone("Pending")

	return (
		<PageLayout class="flex flex-col gap-2 p-8">
			<div class="flex flex-wrap items-center gap-2">
				<Link
					{...props.backLink}
					underline={false}
					class="inline-flex items-center text-sm text-secondary hover:text-primary"
				>
					<span aria-hidden="true">←</span>
				</Link>
				<div class="text-xs font-medium tracking-wider text-tertiary">
					IMAGE QUEUE
				</div>
			</div>

			<Switch>
				<Match when={props.isLoading}>
					<div class={`${surfaceCardClass} p-6 text-sm text-secondary`}>
						Loading…
					</div>
				</Match>

				<Match when={props.isError}>
					<div class={`${surfaceCardClass} p-6 text-sm text-reimu-700`}>
						Failed to load image queue entry.
					</div>
				</Match>

				<Match when={props.detail}>
					{(data) => {
						const queuedPath = imagePath(data())
						const queuedSrc = queuedPath ? imgUrl(queuedPath) : undefined

						return (
							<div class="grid grid-cols-[minmax(0,1fr)_16rem] gap-4">
								<header class="grid grid-cols-[auto_minmax(0,1fr)_16rem] gap-2 col-span-2 items-baseline">
									<Badge
										color={tone().color}
										class="self-baseline-last text-sm"
									>
										{tone().label}
									</Badge>
									<h1 class="text-2xl font-light tracking-tight text-primary">
										<Show
											when={getTargetMeta(data())}
											fallback="Image queue"
										>
											{(target) => (
												<>
													Update request for{" "}
													<Link
														to={target().to}
														params={{ id: target().id.toString() }}
													>
														{props.targetName
															?? `${target().label} #${target().id}`}
													</Link>
													&apos;s {target().imageLabel}
												</>
											)}
										</Show>
									</h1>
									<nav class="flex justify-between gap-4 text-xs text-secondary items-baseline">
										<NeighborLink
											entryId={props.cachedNeighbor?.prev}
											direction="prev"
										/>
										<NeighborLink
											entryId={props.cachedNeighbor?.next}
											direction="next"
										/>
									</nav>
								</header>
								<div class="grid gap-4 md:contents">
									<section class="grid content-start gap-2">
										<div class="grid gap-2 grid-cols-2">
											<DiffImageCard
												title="Current"
												src={props.currentSrc}
												alt="Current target image"
												loading={props.currentLoading}
												error={props.currentError}
											/>
											<DiffImageCard
												title="Queued"
												src={queuedSrc}
												alt="Queued upload preview"
											/>
										</div>
									</section>
									<aside class="grid content-start gap-2">
										<div class="flex flex-col gap-2">
											<ActionPanel
												canManage={props.canManage}
												detail={data()}
												isBusy={props.isBusy}
												onApprove={props.onApprove}
												onReject={props.onReject}
												onRevert={props.onRevert}
												errorMessage={props.mutationErrorMessage}
											/>
											<div class="grid gap-y-2">
												<InfoField label="Submitted by">
													<Link
														to="/user/$id/image-queue"
														params={{ id: data().created_by.id.toString() }}
														class="text-sm"
													>
														{data().created_by.name}
													</Link>
												</InfoField>
												<InfoField label="Created">
													<div class="text-primary text-sm">
														{formatDateTime(data().created_at)}
													</div>
												</InfoField>
												<Show when={data().handled_by ?? data().handled_at}>
													<InfoField label="Handled">
														<Show when={data().handled_by}>
															{(user) => (
																<Link
																	to="/user/$id/image-queue"
																	params={{ id: user().id.toString() }}
																	class="text-sm"
																>
																	{user().name}
																</Link>
															)}
														</Show>
														<Show when={data().handled_at}>
															<div class="text-primary text-sm">
																{formatDateTime(data().handled_at)}
															</div>
														</Show>
													</InfoField>
												</Show>
												<Show when={data().reverted_by ?? data().reverted_at}>
													<InfoField label="Reverted">
														<Show when={data().reverted_by}>
															{(user) => (
																<Link
																	to="/user/$id/image-queue"
																	params={{ id: user().id.toString() }}
																	class="text-sm"
																>
																	{user().name}
																</Link>
															)}
														</Show>
														<Show when={data().reverted_at}>
															<div class="text-primary text-sm">
																{formatDateTime(data().reverted_at)}
															</div>
														</Show>
													</InfoField>
												</Show>
											</div>
										</div>
									</aside>
								</div>
							</div>
						)
					}}
				</Match>
			</Switch>
		</PageLayout>
	)
}

function NeighborLink(props: { entryId?: number; direction: "prev" | "next" }) {
	const isPrev = () => props.direction === "prev"
	const content = () => (
		<>
			<Show when={isPrev()}>
				<span aria-hidden="true">&lt; </span>
			</Show>
			<span class="underline-offset-4 group-hover:underline">
				{isPrev() ? "Prev" : "Next"}
			</span>
			<Show when={!isPrev()}>
				<span aria-hidden="true"> &gt;</span>
			</Show>
		</>
	)

	return (
		<Show
			when={props.entryId}
			fallback={<span class="text-tertiary">{content()}</span>}
		>
			{(id) => (
				<Link
					to="/image-queue/$id"
					params={{ id: id().toString() }}
					underline={false}
					class="text-center h-full group text-secondary hover:text-primary"
				>
					{content()}
				</Link>
			)}
		</Show>
	)
}

function useTargetInfo(detail: () => ImageQueueDetail | undefined) {
	const artistId = createMemo(() => detail()?.artist?.artist_id)
	const releaseId = createMemo(() => detail()?.release?.release_id)

	const artistQuery = useQuery(() => {
		const id = artistId() ?? 0
		return {
			...ArtistQueryOption.findById(id),
			enabled: artistId() !== undefined,
		}
	})

	const releaseQuery = useQuery(() => {
		const id = releaseId() ?? 0
		return {
			...ReleaseQueryOption.findById(id),
			enabled: releaseId() !== undefined,
		}
	})

	const name = createMemo(() => {
		if (artistId() !== undefined) {
			const artist = artistQuery.data
				? O.getOrUndefined(artistQuery.data)
				: undefined
			return artist?.name
		}

		if (releaseId() !== undefined) {
			const release = releaseQuery.data
				? O.getOrUndefined(releaseQuery.data)
				: undefined
			return release?.title
		}
	})

	const currentSrc = createMemo(() => {
		if (artistId() !== undefined) {
			const artist = artistQuery.data
				? O.getOrUndefined(artistQuery.data)
				: undefined
			return imgUrl(artist?.profile_image_url)
		}

		if (releaseId() !== undefined) {
			const release = releaseQuery.data
				? O.getOrUndefined(releaseQuery.data)
				: undefined
			return imgUrl(release?.cover_art_url)
		}
	})

	const currentLoading = createMemo(() => {
		if (artistId() !== undefined) return artistQuery.isLoading
		if (releaseId() !== undefined) return releaseQuery.isLoading
		return false
	})

	const currentError = createMemo(() => {
		if (artistId() !== undefined) return artistQuery.isError
		if (releaseId() !== undefined) return releaseQuery.isError
		return false
	})

	return { name, currentSrc, currentLoading, currentError }
}

function DiffImageCard(props: {
	title: string
	headerRight?: JSX.Element
	src: string | undefined
	alt: string
	loading?: boolean
	error?: boolean
}) {
	return (
		<section class="grid gap-2">
			<header class="flex items-center justify-between gap-3">
				<h2 class={LABEL_CLASS}>{props.title}</h2>
				{props.headerRight}
				<Show when={props.loading}>
					<div class="text-xs text-tertiary">Loading…</div>
				</Show>
			</header>

			<Image.Root>
				<div class="relative aspect-4/3 overflow-hidden rounded-sm border border-slate-200 bg-secondary">
					<Image.Fallback>
						{(state) => (
							<div class="absolute inset-0 grid place-items-center text-sm text-tertiary">
								<Switch>
									<Match when={props.error ?? state === Image.State.Error}>
										Failed to load
									</Match>
									<Match when={props.loading}>Loading…</Match>
									<Match when={!props.src}>No image</Match>
									<Match when={true}>Loading…</Match>
								</Switch>
							</div>
						)}
					</Image.Fallback>
					<Image.Img
						src={props.src}
						alt={props.alt}
						class="size-full object-contain"
					/>
				</div>
			</Image.Root>
		</section>
	)
}

type InfoFieldProps = {
	label: string
	children: JSX.Element
}

function InfoField(props: InfoFieldProps) {
	return (
		<section class="grid gap-1">
			<h2 class={LABEL_CLASS}>{props.label}</h2>
			{props.children}
		</section>
	)
}

type ConfirmActionButtonProps = {
	title: string
	description: string
	confirmText: string
	color: "Green" | "Reimu"
	disabled: boolean
	onConfirm: () => void
	children: string
}

function ConfirmActionButton(props: ConfirmActionButtonProps) {
	const [open, setOpen] = createSignal(false)

	const confirm = () => {
		setOpen(false)
		props.onConfirm()
	}

	return (
		<AlertDialog
			open={open()}
			onOpenChange={setOpen}
			title={props.title}
			description={props.description}
			confirmText={props.confirmText}
			cancelText="Cancel"
			onCancel={() => setOpen(false)}
			onConfirm={confirm}
			trigger={
				<Button
					variant="Primary"
					color={props.color}
					size="Sm"
					disabled={props.disabled}
					class="w-full"
				>
					{props.children}
				</Button>
			}
		/>
	)
}

function ActionPanel(props: {
	canManage: boolean
	detail: ImageQueueDetail
	isBusy: boolean
	onApprove: () => void
	onReject: () => void
	onRevert: () => void
	errorMessage?: string
}) {
	const status = () => props.detail.status
	const isPending = () => status() === "Pending"
	const isApproved = () => status() === "Approved"

	return (
		<section class="grid gap-2">
			<div class="flex items-center justify-between gap-3">
				<div class={LABEL_CLASS}>Actions</div>
				<Show when={props.isBusy}>
					<div class="text-xs text-secondary">Working…</div>
				</Show>
			</div>

			<Switch>
				<Match when={!props.canManage}>
					<div class="text-sm text-secondary">
						No actions available for this account.
					</div>
				</Match>
				<Match when={isPending()}>
					<div class="grid grid-cols-2 gap-2">
						<ConfirmActionButton
							title="Approve image?"
							description="This will mark the queued image as approved."
							confirmText="Approve"
							color="Green"
							disabled={props.isBusy || !isPending()}
							onConfirm={props.onApprove}
						>
							Approve
						</ConfirmActionButton>
						<ConfirmActionButton
							title="Reject image?"
							description="This will mark the queued image as rejected."
							confirmText="Reject"
							color="Reimu"
							disabled={props.isBusy || !isPending()}
							onConfirm={props.onReject}
						>
							Reject
						</ConfirmActionButton>
					</div>
				</Match>
				<Match when={isApproved()}>
					<Button
						variant="Primary"
						color="Blue"
						size="Sm"
						disabled={props.isBusy || !isApproved()}
						class="w-full"
						onClick={() => props.onRevert()}
					>
						Revert
					</Button>
				</Match>
				<Match when={true}>
					<div class="text-sm text-secondary">No actions available.</div>
				</Match>
			</Switch>

			<Show when={props.errorMessage}>
				<div class="rounded-sm border border-reimu-200 bg-reimu-50 px-3 py-2 text-sm text-reimu-800">
					{props.errorMessage}
				</div>
			</Show>
		</section>
	)
}
