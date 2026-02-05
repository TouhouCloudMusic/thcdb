import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import type {
	ImageQueueStatus,
	ImageQueueType,
	PendingImageQueueItem,
} from "@thc/api"
import { ImageQueueQueryOption } from "@thc/query"
import { createMemo, For, Match, Show, Switch } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Badge } from "~/component/atomic/Badge"
import { Link } from "~/component/atomic/Link"
import { Select } from "~/component/atomic/form/select"
import { StickyFilterBar } from "~/component/feature/entity_explore"
import { PageLayout } from "~/layout"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"

const route = getRouteApi("/image-queue/")

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

const TYPE_OPTIONS = ["artist", "release"] as const satisfies ImageQueueType[]

const STATUS_FILTERS = ["pending", "all"] as const

type StatusFilter = (typeof STATUS_FILTERS)[number]

const PAGE_SIZE = 20

const isImageQueueType = (value: string): value is ImageQueueType =>
	TYPE_OPTIONS.some((v) => v === value)

const isStatusFilter = (value: string): value is StatusFilter =>
	STATUS_FILTERS.some((v) => v === value)

const formatDateTime = (value: string) => {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return DATE_TIME.format(date)
}

type ManageFilters = {
	type?: ImageQueueType
	status: StatusFilter
}

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

export function ImageQueueManagePage() {
	const search = route.useSearch()
	const scrollDirection = useScrollDirection()
	// @ts-expect-error
	const navigate = useNavigate({ from: "/image-queue" })

	const filters = createMemo<ManageFilters>(() => ({
		type: search().type,
		status: search().status,
	}))

	const statusFilter = createMemo<ImageQueueStatus | undefined>(() => {
		return filters().status === "pending" ? "Pending" : undefined
	})

	const pendingCountQuery = useQuery(() => ImageQueueQueryOption.pendingCount())

	const listQuery = useInfiniteQuery(() =>
		ImageQueueQueryOption.list({
			limit: PAGE_SIZE,
			type: filters().type,
			status: statusFilter(),
		}),
	)

	const items = () => listQuery.data?.pages.flatMap((p) => p.items) ?? []

	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () => listQuery.hasNextPage && !listQuery.isFetchingNextPage,
		onIntersect: () => {
			void listQuery.fetchNextPage()
		},
	})

	const updateSearch = (key: "type" | "status", next: string | undefined) => {
		const nextSearch = { ...search() }

		if (key === "type") {
			nextSearch.type =
				typeof next === "string" && isImageQueueType(next) ? next : undefined
		}

		if (key === "status") {
			nextSearch.status =
				typeof next === "string" && isStatusFilter(next) ? next : "pending"
		}

		void navigate({
			to: "/image-queue",
			// @ts-expect-error
			search: nextSearch,
		})
	}

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<header class="flex flex-wrap items-start justify-between gap-6">
					<div class="min-w-0">
						<div class="text-xs font-medium tracking-[0.22em] text-slate-500">
							MODERATION
						</div>
						<h1 class="mt-2 text-3xl font-light tracking-tighter text-slate-900">
							Image Queue
						</h1>
					</div>

					<div class="flex flex-wrap items-stretch gap-4">
						<div class="rounded-sm border border-slate-300 bg-white/80 p-4 shadow-xs">
							<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
								PENDING
							</div>
							<div class="mt-2 flex items-baseline gap-3">
								<div class="text-4xl font-semibold tracking-tight text-slate-900">
									<Show
										when={pendingCountQuery.data !== undefined}
										fallback={<span class="opacity-30">—</span>}
									>
										{pendingCountQuery.data}
									</Show>
								</div>
								<div class="text-sm text-slate-500">items</div>
							</div>
						</div>
					</div>
				</header>

				<StickyFilterBar scrollDirection={scrollDirection}>
					<div class="flex flex-wrap items-center justify-between gap-4">
						<div class="flex flex-wrap items-center gap-4">
							<div class="flex items-center gap-2">
								<span class="text-sm text-slate-500">Type</span>
								<Select
									value={filters().type ?? ""}
									onChange={(e) => updateSearch("type", e.currentTarget.value)}
								>
									<Select.Option value="">All</Select.Option>
									<For each={TYPE_OPTIONS}>
										{(type) => (
											<Select.Option value={type}>{type}</Select.Option>
										)}
									</For>
								</Select>
							</div>

							<div class="flex items-center gap-2">
								<span class="text-sm text-slate-500">Status</span>
								<Select
									value={filters().status}
									onChange={(e) =>
										updateSearch("status", e.currentTarget.value)
									}
								>
									<Select.Option value="pending">Pending</Select.Option>
									<Select.Option value="all">All</Select.Option>
								</Select>
							</div>
						</div>

						<div class="flex items-center gap-2">
							<span class="text-xs font-medium tracking-[0.22em] text-slate-400">
								{items().length} SHOWN
							</span>
						</div>
					</div>
				</StickyFilterBar>

				<section class="overflow-hidden rounded-sm border border-slate-300 bg-white shadow-xs">
					<div class="grid grid-cols-[4rem_1fr_12rem_12rem_9rem] items-center border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium tracking-[0.18em] text-slate-500">
						<div>ID</div>
						<div>CREATED BY</div>
						<div>IMAGE</div>
						<div>CREATED</div>
						<div>STATUS</div>
					</div>

					<Switch>
						<Match when={listQuery.isLoading}>
							<div class="divide-y divide-slate-100">
								<For each={Array.from({ length: PAGE_SIZE })}>
									{() => <RowSkeleton />}
								</For>
							</div>
						</Match>

						<Match when={listQuery.isError}>
							<div class="p-6 text-sm text-reimu-700">
								Failed to load image queue.
							</div>
						</Match>

						<Match when={items().length === 0}>
							<div class="p-10">
								<div class="text-sm font-medium text-slate-900">
									No entries found
								</div>
								<div class="mt-1 text-sm text-slate-500">
									Try changing the filters or come back later.
								</div>
							</div>
						</Match>

						<Match when={true}>
							<div class="divide-y divide-slate-100">
								<For each={items()}>{(item) => <QueueRow item={item} />}</For>
							</div>
						</Match>
					</Switch>

					<div
						ref={setSentinelRef}
						class="h-1"
					></div>

					<Show when={listQuery.isFetchingNextPage}>
						<div class="divide-y divide-slate-100 border-t border-slate-100">
							<For each={Array.from({ length: Math.min(10, PAGE_SIZE) })}>
								{() => <RowSkeleton />}
							</For>
						</div>
					</Show>

					<Show when={!listQuery.hasNextPage && items().length > 0}>
						<div class="border-t border-slate-100 px-4 py-4 text-center text-sm text-slate-400">
							No more entries
						</div>
					</Show>
				</section>
			</div>
		</PageLayout>
	)
}

function QueueRow(props: { item: PendingImageQueueItem }) {
	const tone = () => statusTone(props.item.status)
	const imageId = () =>
		props.item.image_id === null ? "—" : props.item.image_id.toString()
	const createdAt = () => formatDateTime(props.item.created_at)

	const rowClass = () =>
		twMerge(
			"grid grid-cols-[4rem_1fr_12rem_12rem_9rem] items-center px-4 py-3 text-sm",
			"hover:bg-slate-50",
		)

	return (
		<div class={rowClass()}>
			<div class="font-mono text-xs text-slate-600">
				<Link
					to="/image-queue/$id"
					params={{ id: props.item.id.toString() }}
					class="text-slate-900 no-underline hover:underline"
				>
					{props.item.id}
				</Link>
			</div>

			<div class="min-w-0">
				<div class="flex min-w-0 items-center gap-2">
					<Link
						to="/user/$id/image-queue"
						params={{ id: props.item.created_by.id.toString() }}
						class="truncate text-slate-900 no-underline hover:underline"
					>
						{props.item.created_by.name}
					</Link>
				</div>
			</div>

			<div class="text-sm text-slate-500">{imageId()}</div>
			<div class="text-sm text-slate-500">{createdAt()}</div>

			<div class="justify-self-start">
				<Badge
					color={tone().color}
					class="px-2 py-0.5"
				>
					{tone().label}
				</Badge>
			</div>
		</div>
	)
}

function RowSkeleton() {
	return (
		<div class="grid animate-pulse grid-cols-[4rem_1fr_12rem_12rem_9rem] items-center px-4 py-3">
			<div class="h-4 w-20 rounded bg-slate-200"></div>
			<div class="h-4 w-64 rounded bg-slate-200"></div>
			<div class="h-4 w-24 rounded bg-slate-100"></div>
			<div class="h-4 w-32 rounded bg-slate-100"></div>
			<div class="h-5 w-24 rounded-full bg-slate-200"></div>
		</div>
	)
}
