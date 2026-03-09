import { useQuery, useQueryClient } from "@tanstack/solid-query"
import { useNavigate } from "@tanstack/solid-router"
import type { ImageQueueDetail, ImageQueueStatus } from "@thc/api"
import {
	ArtistQueryOption,
	ImageQueueMutation,
	ImageQueueQueryOption,
	ReleaseQueryOption,
} from "@thc/query"
import { ObjExt } from "@thc/toolkit/data"
import { Option as O } from "effect"
import { createMemo, Match, Show, Switch } from "solid-js"
import type { ParentProps } from "solid-js"

import { Badge } from "~/component/atomic/Badge"
import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { Image } from "~/component/image"
import { PageLayout } from "~/layout"
import { imgUrl } from "~/utils/adapter/static_file"

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

const statusTone = (status: ImageQueueStatus) => {
	switch (status) {
		case "Pending": {
			return { color: "Marisa", label: "PENDING" } as const
		}
		case "Approved": {
			return { color: "Green", label: "APPROVED" } as const
		}
		case "Rejected": {
			return { color: "Reimu", label: "REJECTED" } as const
		}
		case "Cancelled": {
			return { color: "Slate", label: "CANCELLED" } as const
		}
		case "Reverted": {
			return { color: "Blue", label: "REVERTED" } as const
		}
		default: {
			return { color: "Slate", label: "UNKNOWN" } as const
		}
	}
}

const formatDateTime = (value: string | null | undefined) => {
	if (!value) return "—"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return DATE_TIME.format(date)
}

const imagePath = (detail: ImageQueueDetail) => {
	const image = detail.image
	if (!image) return
	const dir = image.directory.replaceAll(/\/+$/g, "")
	if (!dir) return image.filename
	return `${dir}/${image.filename}`
}

type Props = {
	entryId: number
}

const extractErrorMessage = (error: unknown) => {
	if (!ObjExt.isRecord(error)) return

	const apiError = error["error"]
	if (typeof apiError === "string") return apiError

	const message = error["message"]
	if (typeof message === "string") return message
}

const extractInfiniteQueryIds = (data: unknown): number[] => {
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
	const navigate = useNavigate()
	const queryClient = useQueryClient()
	const detailQuery = useQuery(() =>
		ImageQueueQueryOption.detail(props.entryId),
	)
	const mutation = ImageQueueMutation.getHandleInstance()

	const detail = createMemo(() => detailQuery.data)
	const tone = createMemo(() =>
		detail() ? statusTone(detail()!.status) : statusTone("Pending"),
	)

	const onBack = () => {
		void navigate({ to: "/image-queue", search: { status: "pending" } })
	}

	const refresh = () => {
		void queryClient.invalidateQueries({ queryKey: ["image-queue::detail"] })
		void queryClient.invalidateQueries({ queryKey: ["image-queue::list"] })
		void queryClient.invalidateQueries({
			queryKey: ["image-queue::pending-count"],
		})
		void queryClient.invalidateQueries({ queryKey: ["image-queue::user"] })
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
		return extractErrorMessage(mutation.error)
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
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<header class="flex flex-wrap items-center justify-between gap-4">
					<div class="min-w-0">
						<div class="flex flex-wrap items-center gap-3">
							<Button
								variant="SecondaryV2"
								size="Sm"
								color="Slate"
								onClick={onBack}
							>
								Back
							</Button>
							<div class="text-xs font-medium tracking-[0.22em] text-slate-500">
								IMAGE QUEUE
							</div>
							<Show when={detail()}>
								<Badge
									color={tone().color}
									class="px-2 py-0.5"
								>
									{tone().label}
								</Badge>
							</Show>
						</div>
						<h1 class="mt-3 text-2xl font-light tracking-tight text-slate-900">
							Entry {props.entryId}
						</h1>
						<div class="mt-2 flex items-center gap-4">
							<Show
								when={cachedNeighbor()?.prev}
								fallback={
									<span class="font-mono text-xs text-slate-300">
										&lt; Prev
									</span>
								}
							>
								{(id) => (
									<Link
										to="/image-queue/$id"
										params={{ id: id().toString() }}
										class="font-mono text-xs text-slate-500 no-underline hover:text-slate-900 hover:underline"
									>
										&lt; Prev
									</Link>
								)}
							</Show>

							<Show
								when={cachedNeighbor()?.next}
								fallback={
									<span class="font-mono text-xs text-slate-300">
										Next &gt;
									</span>
								}
							>
								{(id) => (
									<Link
										to="/image-queue/$id"
										params={{ id: id().toString() }}
										class="font-mono text-xs text-slate-500 no-underline hover:text-slate-900 hover:underline"
									>
										Next &gt;
									</Link>
								)}
							</Show>
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<Button
							variant="SecondaryV2"
							size="Sm"
							color="Slate"
							onClick={refresh}
						>
							Refresh
						</Button>
					</div>
				</header>

				<Switch>
					<Match when={detailQuery.isLoading}>
						<div class="rounded-sm border border-slate-300 bg-white p-6 shadow-xs">
							<div class="text-sm text-slate-500">Loading…</div>
						</div>
					</Match>

					<Match when={detailQuery.isError}>
						<div class="rounded-sm border border-slate-300 bg-white p-6 shadow-xs">
							<div class="text-sm text-reimu-700">
								Failed to load image queue entry.
							</div>
						</div>
					</Match>

					<Match when={detail()}>
						{(data) => (
							<div class="grid gap-6">
								<DiffPanel detail={data()} />

								<div class="grid gap-6 xl:grid-cols-2">
									<TargetPanel detail={data()} />
									<AuditPanel detail={data()} />
								</div>

								<ActionPanel
									detail={data()}
									isBusy={mutation.isPending}
									onApprove={() => handle("Approve")}
									onReject={() => handle("Reject")}
									onRevert={() => handle("Revert")}
									errorMessage={mutationErrorMessage()}
								/>
							</div>
						)}
					</Match>
				</Switch>
			</div>
		</PageLayout>
	)
}

function PanelShell(props: ParentProps<{ title: string }>) {
	return (
		<section class="overflow-hidden rounded-sm border border-slate-300 bg-white shadow-xs">
			<div class="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
				<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
					{props.title}
				</div>
			</div>
			<div class="p-4">{props.children}</div>
		</section>
	)
}

const useTargetCurrentImage = (detail: () => ImageQueueDetail) => {
	const artistId = createMemo(() => detail().artist?.artist_id)
	const releaseId = createMemo(() => detail().release?.release_id)

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

	const currentSrc = createMemo(() => {
		if (artistId() !== undefined) {
			const artist = artistQuery.data
				? O.getOrUndefined(artistQuery.data)
				: undefined
			return artist?.profile_image_url ?? undefined
		}

		if (releaseId() !== undefined) {
			const release = releaseQuery.data
				? O.getOrUndefined(releaseQuery.data)
				: undefined
			return release?.cover_art_url ?? undefined
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

	return { currentSrc, currentLoading, currentError }
}

function DiffPanel(props: { detail: ImageQueueDetail }) {
	const queuedSrc = createMemo(() => {
		const path = imagePath(props.detail)
		if (!path) return
		return imgUrl(path)
	})

	const { currentSrc, currentLoading, currentError } = useTargetCurrentImage(
		() => props.detail,
	)

	return (
		<section class="overflow-hidden rounded-sm border border-slate-300 bg-white shadow-xs">
			<div class="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
				<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
					DIFF
				</div>
			</div>

			<div class="p-4">
				<div class="grid gap-4 md:grid-cols-2">
					<DiffImageCard
						title="CURRENT"
						src={currentSrc()}
						alt="Current target image"
						loading={currentLoading()}
						error={currentError()}
					/>
					<DiffImageCard
						title="QUEUED"
						src={queuedSrc()}
						alt="Queued upload preview"
					/>
				</div>
			</div>
		</section>
	)
}

function DiffImageCard(props: {
	title: string
	src: string | undefined
	alt: string
	loading?: boolean
	error?: boolean
}) {
	return (
		<div class="space-y-2">
			<div class="flex items-center justify-between gap-3">
				<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
					{props.title}
				</div>
				<Show when={props.loading}>
					<div class="text-xs text-slate-400">Loading…</div>
				</Show>
			</div>

			<Image.Root>
				<div class="relative isolate aspect-square overflow-hidden rounded-sm border border-slate-200 bg-slate-100">
					<Image.Fallback>
						{(state) => (
							<div class="absolute inset-0 grid place-items-center text-sm text-slate-400">
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
		</div>
	)
}

function TargetPanel(props: { detail: ImageQueueDetail }) {
	const artist = createMemo(() => props.detail.artist)
	const release = createMemo(() => props.detail.release)

	return (
		<PanelShell title="TARGET">
			<Switch>
				<Match when={artist()}>
					{(target) => (
						<div class="space-y-3 text-sm">
							<div class="flex items-center justify-between gap-3">
								<div class="text-slate-500">Artist</div>
								<Link
									to="/artist/$id"
									params={{ id: target().artist_id.toString() }}
									class="font-mono text-slate-900 no-underline hover:underline"
								>
									{target().artist_id}
								</Link>
							</div>
							<div class="flex items-center justify-between gap-3">
								<div class="text-slate-500">Type</div>
								<div class="font-mono text-slate-900">{target().type}</div>
							</div>
						</div>
					)}
				</Match>

				<Match when={release()}>
					{(target) => (
						<div class="space-y-3 text-sm">
							<div class="flex items-center justify-between gap-3">
								<div class="text-slate-500">Release</div>
								<Link
									to="/release/$id"
									params={{ id: target().release_id.toString() }}
									class="font-mono text-slate-900 no-underline hover:underline"
								>
									{target().release_id}
								</Link>
							</div>
							<div class="flex items-center justify-between gap-3">
								<div class="text-slate-500">Type</div>
								<div class="font-mono text-slate-900">{target().type}</div>
							</div>
						</div>
					)}
				</Match>

				<Match when={true}>
					<div class="text-sm text-slate-500">No target info.</div>
				</Match>
			</Switch>
		</PanelShell>
	)
}

function AuditPanel(props: { detail: ImageQueueDetail }) {
	return (
		<PanelShell title="AUDIT">
			<div class="grid gap-4 text-sm">
				<div class="grid gap-1 rounded-sm border border-slate-200 bg-slate-50 p-3">
					<div class="text-xs font-medium tracking-[0.18em] text-slate-500">
						CREATED
					</div>
					<div class="text-slate-900">{props.detail.created_by.name}</div>
					<div class="text-slate-500">
						{formatDateTime(props.detail.created_at)}
					</div>
				</div>

				<div class="grid gap-1 rounded-sm border border-slate-200 bg-slate-50 p-3">
					<div class="text-xs font-medium tracking-[0.18em] text-slate-500">
						HANDLED
					</div>
					<div class="text-slate-900">
						<Show
							when={props.detail.handled_by}
							fallback={<span class="text-slate-400">—</span>}
						>
							{props.detail.handled_by?.name}
						</Show>
					</div>
					<div class="text-slate-500">
						{formatDateTime(props.detail.handled_at)}
					</div>
				</div>

				<div class="grid gap-1 rounded-sm border border-slate-200 bg-slate-50 p-3">
					<div class="text-xs font-medium tracking-[0.18em] text-slate-500">
						REVERTED
					</div>
					<div class="text-slate-900">
						<Show
							when={props.detail.reverted_by}
							fallback={<span class="text-slate-400">—</span>}
						>
							{props.detail.reverted_by?.name}
						</Show>
					</div>
					<div class="text-slate-500">
						{formatDateTime(props.detail.reverted_at)}
					</div>
				</div>
			</div>
		</PanelShell>
	)
}

function ActionPanel(props: {
	detail: ImageQueueDetail
	isBusy: boolean
	onApprove: () => void
	onReject: () => void
	onRevert: () => void
	errorMessage?: string
}) {
	const status = createMemo(() => props.detail.status)
	const canApprove = createMemo(() => status() === "Pending")
	const canReject = createMemo(() => status() === "Pending")
	const canRevert = createMemo(() => status() === "Approved")

	const pendingActions = () => (
		<div class="grid grid-cols-2 gap-3">
			<Button
				variant="PrimaryV2"
				color="Green"
				disabled={props.isBusy || !canApprove()}
				class="w-full justify-center"
				onClick={() => props.onApprove()}
			>
				Approve
			</Button>
			<Button
				variant="PrimaryV2"
				color="Reimu"
				disabled={props.isBusy || !canReject()}
				class="w-full justify-center"
				onClick={() => props.onReject()}
			>
				Reject
			</Button>
		</div>
	)

	const approvedActions = () => (
		<div class="grid grid-cols-2 gap-3">
			<Button
				variant="PrimaryV2"
				color="Blue"
				disabled={props.isBusy || !canRevert()}
				class="col-span-2 w-full justify-center"
				onClick={() => props.onRevert()}
			>
				Revert
			</Button>
		</div>
	)

	return (
		<section class="overflow-hidden rounded-sm border border-slate-300 bg-white shadow-xs">
			<div class="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
				<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
					ACTIONS
				</div>
				<Show when={props.isBusy}>
					<div class="text-xs text-slate-500">Working…</div>
				</Show>
			</div>

			<div class="p-4">
				<Switch>
					<Match when={status() === "Pending"}>{pendingActions()}</Match>
					<Match when={status() === "Approved"}>{approvedActions()}</Match>
					<Match when={true}>
						<div class="text-sm text-slate-500">
							No actions available for this status.
						</div>
					</Match>
				</Switch>

				<Show when={props.errorMessage}>
					<div class="mt-4 rounded-sm border border-reimu-200 bg-reimu-50 px-3 py-2 text-sm text-reimu-800">
						{props.errorMessage}
					</div>
				</Show>
			</div>
		</section>
	)
}
