import type { ImageQueueStatus, ImageQueueType } from "@thc/api"
import {
	createMemo,
	createSignal,
	For,
	Match,
	onMount,
	Show,
	Switch,
} from "solid-js"
import { createStore, produce } from "solid-js/store"
import { twMerge } from "tailwind-merge"

import { Badge } from "~/component/atomic/Badge"
import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { Select } from "~/component/atomic/form/select"
import { PageLayout } from "~/layout"
import type { MockImageQueueEntry } from "~/mock/image_queue"
import {
	createMockImageQueueEntries,
	MOCK_IMAGE_QUEUE_TYPES,
} from "~/mock/image_queue"

const ACTION_USER = { id: 901, name: "Moderator" } as const

const TYPE_FILTER_OPTIONS = ["", ...MOCK_IMAGE_QUEUE_TYPES]

type StatusFilter = ("pending" | "all")[number]
const STATUS_FILTERS: StatusFilter[] = ["pending", "all"]

const isStatusFilter = (value: string): value is StatusFilter =>
	STATUS_FILTERS.some((v) => v === value)

const getTypeLabel = (value: string) => (value === "" ? "All" : value)

const getStatusLabel = (value: StatusFilter) =>
	value === "pending" ? "Pending" : "All"

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

const svgPreviewUrl = (seed: number) => {
	const hue = (seed * 37) % 360
	const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="hsl(${hue} 86% 55%)"/>
          <stop offset="1" stop-color="hsl(${(hue + 42) % 360} 82% 52%)"/>
        </linearGradient>
        <pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse">
          <path d="M18 0H0V18" fill="none" stroke="rgba(15,23,42,0.08)" stroke-width="2"/>
        </pattern>
      </defs>
      <rect width="900" height="900" fill="url(#g)"/>
      <rect width="900" height="900" fill="url(#p)"/>
      <rect x="40" y="40" width="820" height="820" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" stroke-width="2"/>
      <text x="70" y="120" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="40" fill="rgba(255,255,255,0.92)">IMAGE QUEUE</text>
    </svg>
  `.trim()

	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function ImageQueueMockPage() {
	const DATASET_SIZE = 48
	const PAGE_SIZE = 20
	const INITIAL_SEED = 42

	const [entries, setEntries] = createStore(
		createMockImageQueueEntries(DATASET_SIZE, INITIAL_SEED),
	)

	const [typeFilter, setTypeFilter] = createSignal<ImageQueueType | undefined>(
		undefined,
	)
	const [statusFilter, setStatusFilter] = createSignal<StatusFilter>("pending")
	const [nextCursor, setNextCursor] = createSignal<number | null>(null)
	const [loadedIds, setLoadedIds] = createSignal<number[]>([])
	const [selectedId, setSelectedId] = createSignal<number | undefined>(
		undefined,
	)
	const [activeUserId, setActiveUserId] = createSignal<number | undefined>(
		undefined,
	)
	const [flash, setFlash] = createSignal<string | undefined>(undefined)

	const pendingCount = createMemo(
		() => entries.filter((e) => e.detail.status === "Pending").length,
	)

	const filteredEntries = createMemo(() => {
		const type = typeFilter()
		const status = statusFilter()

		return entries.filter((entry) => {
			if (type && entry.type !== type) return false
			if (status === "pending" && entry.detail.status !== "Pending")
				return false
			return true
		})
	})

	const selected = createMemo(() =>
		entries.find((e) => e.detail.id === selectedId()),
	)

	const selectEntry = (id: number) => {
		const entry = entries.find((e) => e.detail.id === id)
		if (!entry) return

		setSelectedId(entry.detail.id)
		setActiveUserId(entry.detail.created_by.id)
	}

	const page = (cursor: number | null) => {
		const source = filteredEntries()
		const sliced = cursor ? source.filter((e) => e.detail.id < cursor) : source
		const pageEntries = sliced.slice(0, PAGE_SIZE)
		const hasNext = sliced.length > PAGE_SIZE
		const next = hasNext ? (pageEntries.at(-1)?.detail.id ?? null) : null

		return {
			ids: pageEntries.map((e) => e.detail.id),
			next_cursor: next,
		}
	}

	const loadMore = () => {
		const res = page(nextCursor())
		if (res.ids.length === 0) return

		setLoadedIds((prev) => prev.concat(res.ids))
		setNextCursor(res.next_cursor)

		if (!selectedId()) {
			selectEntry(res.ids[0]!)
		}
	}

	const reload = () => {
		setLoadedIds([])
		setNextCursor(null)
		loadMore()
	}

	const applyAction = (method: "Approve" | "Reject" | "Revert") => {
		const id = selectedId()
		if (!id) return

		const now = new Date().toISOString()

		setEntries(
			(entry) => entry.detail.id === id,
			produce((draft) => {
				if (method === "Approve") {
					if (draft.detail.status !== "Pending") return
					draft.detail.status = "Approved"
					draft.detail.handled_at = now
					draft.detail.handled_by = ACTION_USER
				}

				if (method === "Reject") {
					if (draft.detail.status !== "Pending") return
					draft.detail.status = "Rejected"
					draft.detail.handled_at = now
					draft.detail.handled_by = ACTION_USER
					draft.detail.image_id = null
					draft.detail.image = null
				}

				if (method === "Revert") {
					if (draft.detail.status !== "Approved") return
					draft.detail.status = "Reverted"
					draft.detail.reverted_at = now
					draft.detail.reverted_by = {
						id: ACTION_USER.id,
						name: ACTION_USER.name,
					}
				}
			}),
		)

		setFlash(`${method} applied`)
		reload()
	}

	const listItems = createMemo(() => {
		const ids = loadedIds()
		return ids
			.map((id) => entries.find((e) => e.detail.id === id))
			.filter((v): v is MockImageQueueEntry => v !== undefined)
	})

	const userEntries = createMemo(() => {
		const userId = activeUserId()
		if (!userId) return []

		return entries
			.filter((e) => e.detail.created_by.id === userId)
			.toSorted((a, b) => b.detail.id - a.detail.id)
	})

	const neighbor = createMemo(() => {
		const current = selectedId()
		if (!current) return

		const queueIds = loadedIds()
		const queueIndex = queueIds.indexOf(current)
		if (queueIndex !== -1) {
			return { prev: queueIds[queueIndex - 1], next: queueIds[queueIndex + 1] }
		}

		const userIds = userEntries().map((e) => e.detail.id)
		const userIndex = userIds.indexOf(current)
		if (userIndex === -1) return

		return { prev: userIds[userIndex - 1], next: userIds[userIndex + 1] }
	})

	const goToEntry = (id: number | undefined) => {
		if (!id) return
		selectEntry(id)
	}

	const resetFilter = (key: "type" | "status", value: string) => {
		if (key === "type") {
			const next = MOCK_IMAGE_QUEUE_TYPES.find((t) => t === value)
			setTypeFilter(next)
			reload()
		}

		if (key === "status") {
			setStatusFilter(isStatusFilter(value) ? value : "pending")
			reload()
		}
	}

	onMount(() => loadMore())

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
									{pendingCount()}
								</div>
								<div class="text-sm text-slate-500">items</div>
							</div>
						</div>
					</div>
				</header>

				<section class="flex flex-wrap items-center justify-between gap-4 rounded-sm border border-slate-300 bg-white p-4 shadow-xs">
					<div class="flex flex-wrap items-center gap-4">
						<div class="flex items-center gap-2">
							<span class="text-sm text-slate-500">Type</span>
							<Select.Root<string>
								options={TYPE_FILTER_OPTIONS}
								value={typeFilter() ?? ""}
								onChange={(value) => resetFilter("type", value ?? "")}
								itemComponent={(props) => (
									<Select.Item item={props.item}>
										{getTypeLabel(props.item.rawValue)}
									</Select.Item>
								)}
							>
								<Select.Trigger>
									<Select.Value<string>>
										{(state) => getTypeLabel(state.selectedOption() ?? "")}
									</Select.Value>
									<Select.Icon />
								</Select.Trigger>
								<Select.Portal>
									<Select.Content>
										<Select.Listbox />
									</Select.Content>
								</Select.Portal>
							</Select.Root>
						</div>

						<div class="flex items-center gap-2">
							<span class="text-sm text-slate-500">Status</span>
							<Select.Root<StatusFilter>
								options={STATUS_FILTERS}
								value={statusFilter()}
								onChange={(value) => {
									if (value === null) return
									resetFilter("status", value)
								}}
								itemComponent={(props) => (
									<Select.Item item={props.item}>
										{getStatusLabel(props.item.rawValue)}
									</Select.Item>
								)}
							>
								<Select.Trigger>
									<Select.Value<StatusFilter>>
										{(state) =>
											getStatusLabel(state.selectedOption() ?? "pending")
										}
									</Select.Value>
									<Select.Icon />
								</Select.Trigger>
								<Select.Portal>
									<Select.Content>
										<Select.Listbox />
									</Select.Content>
								</Select.Portal>
							</Select.Root>
						</div>
					</div>

					<div class="flex items-center gap-2">
						<span class="text-xs font-medium tracking-[0.22em] text-slate-400">
							{listItems().length} SHOWN
						</span>
					</div>
				</section>

				<Show when={flash()}>
					<div class="rounded-sm border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700">
						{flash()}
					</div>
				</Show>

				<div class="grid gap-6 xl:grid-cols-[0.42fr_0.58fr]">
					<div class="grid gap-6 lg:grid-cols-2 xl:grid-cols-1">
						<ListPanel
							items={listItems()}
							hasNext={nextCursor() !== null}
							onLoadMore={loadMore}
							onSelect={selectEntry}
							selectedId={selectedId()}
						/>
						<UserPanel
							userName={selected()?.detail.created_by.name}
							items={userEntries()}
							onSelect={selectEntry}
						/>
					</div>

					<DetailPanel
						entry={selected()}
						prevId={neighbor()?.prev}
						nextId={neighbor()?.next}
						onPrev={() => goToEntry(neighbor()?.prev)}
						onNext={() => goToEntry(neighbor()?.next)}
						onApprove={() => applyAction("Approve")}
						onReject={() => applyAction("Reject")}
						onRevert={() => applyAction("Revert")}
					/>
				</div>
			</div>
		</PageLayout>
	)
}

function ListPanel(props: {
	items: MockImageQueueEntry[]
	selectedId: number | undefined
	hasNext: boolean
	onLoadMore: () => void
	onSelect: (id: number) => void
}) {
	const headerClass =
		"flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3"

	return (
		<section class="overflow-hidden rounded-sm border border-slate-300 bg-white shadow-xs">
			<div class={headerClass}>
				<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
					QUEUE
				</div>
				<div class="text-xs font-medium tracking-[0.18em] text-slate-400">
					{props.items.length} LOADED
				</div>
			</div>

			<div class="divide-y divide-slate-100">
				<For each={props.items}>
					{(entry) => (
						<ListRow
							entry={entry}
							active={props.selectedId === entry.detail.id}
							onSelect={() => props.onSelect(entry.detail.id)}
						/>
					)}
				</For>
			</div>

			<Show when={props.hasNext}>
				<div class="border-t border-slate-100 p-3">
					<Button
						variant="SecondaryV2"
						size="Sm"
						color="Slate"
						class="w-full justify-center"
						onClick={() => props.onLoadMore()}
					>
						Load more
					</Button>
				</div>
			</Show>
		</section>
	)
}

function ListRow(props: {
	entry: MockImageQueueEntry
	active: boolean
	onSelect: () => void
}) {
	const tone = () => statusTone(props.entry.detail.status)
	const rowClass = () =>
		twMerge(
			"grid w-full cursor-pointer grid-cols-[4rem_1fr_auto] items-center gap-3 px-4 py-3 text-left text-sm",
			"appearance-none bg-transparent",
			"focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-reimu-600",
			props.active ? "bg-slate-50" : "hover:bg-slate-50",
		)

	return (
		<button
			type="button"
			class={rowClass()}
			onClick={() => props.onSelect()}
		>
			<div class="font-mono text-xs text-slate-600">
				{props.entry.detail.id}
			</div>
			<div class="min-w-0">
				<div class="truncate text-slate-900">
					{props.entry.detail.created_by.name}
				</div>
				<div class="mt-0.5 text-xs text-slate-400">
					{props.entry.type} · {formatDateTime(props.entry.detail.created_at)}
				</div>
			</div>
			<Badge
				color={tone().color}
				class="px-2 py-0.5"
			>
				{tone().label}
			</Badge>
		</button>
	)
}

function UserPanel(props: {
	userName: string | undefined
	items: MockImageQueueEntry[]
	onSelect: (id: number) => void
}) {
	return (
		<section class="overflow-hidden rounded-sm border border-slate-300 bg-white shadow-xs">
			<div class="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
				<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
					USER QUEUE
				</div>
				<div class="text-xs font-medium tracking-[0.18em] text-slate-400">
					<Show
						when={props.userName}
						fallback={"—"}
					>
						{props.userName}
					</Show>
				</div>
			</div>

			<Show
				when={props.userName && props.items.length > 0}
				fallback={
					<div class="p-6 text-sm text-slate-500">
						Select an entry to preview the creator's queue history.
					</div>
				}
			>
				<div class="divide-y divide-slate-100">
					<For each={props.items}>
						{(entry) => (
							<button
								type="button"
								class="grid w-full cursor-pointer grid-cols-[4rem_1fr] items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-reimu-600"
								onClick={() => props.onSelect(entry.detail.id)}
							>
								<div class="font-mono text-xs text-slate-600">
									{entry.detail.id}
								</div>
								<div class="min-w-0">
									<div class="flex items-center justify-between gap-3">
										<div class="truncate text-slate-900">
											{entry.detail.status}
										</div>
										<span class="text-xs text-slate-400">
											<Show
												when={entry.detail.image_id}
												fallback="—"
											>
												{entry.detail.image_id}
											</Show>
										</span>
									</div>
									<div class="mt-0.5 text-xs text-slate-400">
										Handled {formatDateTime(entry.detail.handled_at)} · Reverted{" "}
										{formatDateTime(entry.detail.reverted_at)}
									</div>
								</div>
							</button>
						)}
					</For>
				</div>
			</Show>
		</section>
	)
}

function DetailPanel(props: {
	entry: MockImageQueueEntry | undefined
	prevId: number | undefined
	nextId: number | undefined
	onPrev: () => void
	onNext: () => void
	onApprove: () => void
	onReject: () => void
	onRevert: () => void
}) {
	const tone = createMemo(() =>
		props.entry ? statusTone(props.entry.detail.status) : statusTone("Pending"),
	)

	const queuedSrc = createMemo(() => {
		if (!props.entry) return
		return svgPreviewUrl(props.entry.detail.id)
	})

	const currentSrc = createMemo(() => {
		if (!props.entry) return
		return svgPreviewUrl(props.entry.detail.id + 1000)
	})

	const status = createMemo(() => props.entry?.detail.status)

	const pendingActions = () => (
		<div class="grid grid-cols-2 gap-3">
			<Button
				variant="PrimaryV2"
				color="Green"
				class="w-full justify-center"
				onClick={() => props.onApprove()}
			>
				Approve
			</Button>
			<Button
				variant="PrimaryV2"
				color="Reimu"
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
					DETAIL
				</div>
				<Show when={props.entry}>
					<Badge
						color={tone().color}
						class="px-2 py-0.5"
					>
						{tone().label}
					</Badge>
				</Show>
			</div>

			<Show
				when={props.entry}
				fallback={
					<div class="p-6 text-sm text-slate-500">
						Select an entry to inspect.
					</div>
				}
			>
				{(entry) => (
					<div class="p-4">
						<div class="grid gap-6">
							<div class="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
								<button
									type="button"
									disabled={!props.prevId}
									onClick={() => {
										if (!props.prevId) return
										props.onPrev()
									}}
									class={twMerge(
										"font-mono text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline",
										!props.prevId && "pointer-events-none text-slate-300",
									)}
								>
									&lt; Prev
								</button>
								<button
									type="button"
									disabled={!props.nextId}
									onClick={() => {
										if (!props.nextId) return
										props.onNext()
									}}
									class={twMerge(
										"font-mono text-xs text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline",
										!props.nextId && "pointer-events-none text-slate-300",
									)}
								>
									Next &gt;
								</button>
							</div>

							<div class="rounded-sm border border-slate-200 bg-slate-50 p-4">
								<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
									DIFF
								</div>
								<div class="mt-3 grid gap-4 md:grid-cols-2">
									<div class="space-y-2">
										<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
											CURRENT
										</div>
										<div class="overflow-hidden rounded-sm border border-slate-200 bg-slate-100">
											<img
												src={currentSrc()}
												alt="Current target"
												class="aspect-square w-full object-contain"
											/>
										</div>
									</div>

									<div class="space-y-2">
										<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
											QUEUED
										</div>
										<div class="overflow-hidden rounded-sm border border-slate-200 bg-slate-100">
											<img
												src={queuedSrc()}
												alt="Queued upload"
												class="aspect-square w-full object-contain"
											/>
										</div>
									</div>
								</div>
							</div>

							<div class="grid gap-6 xl:grid-cols-2">
								<div class="rounded-sm border border-slate-200 bg-slate-50 p-4">
									<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
										IMAGE
									</div>
									<div class="mt-3 grid gap-3 text-sm">
										<div class="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
											<div class="text-slate-500">Created</div>
											<div class="text-slate-900">
												{formatDateTime(entry().detail.created_at)}
											</div>
										</div>

										<div class="grid grid-cols-[8rem_minmax(0,1fr)] gap-3">
											<div class="text-slate-500">Creator</div>
											<div class="text-slate-900">
												{entry().detail.created_by.name}
											</div>
										</div>
									</div>
								</div>

								<div class="grid gap-4">
									<div class="rounded-sm border border-slate-200 bg-slate-50 p-4">
										<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
											TARGET
										</div>
										<div class="mt-3 grid gap-2 text-sm">
											<Switch>
												<Match when={entry().type === "artist"}>
													<div class="flex items-center justify-between gap-3">
														<div class="text-slate-500">Artist</div>
														<Link
															to="/artist/$id"
															params={{
																id:
																	entry().detail.artist?.artist_id.toString()
																	?? "1",
															}}
															class="font-mono text-slate-900 no-underline hover:underline"
														>
															{entry().detail.artist?.artist_id}
														</Link>
													</div>
													<div class="flex items-center justify-between gap-3">
														<div class="text-slate-500">Type</div>
														<div class="font-mono text-slate-900">
															{entry().detail.artist?.type}
														</div>
													</div>
												</Match>

												<Match when={entry().type === "release"}>
													<div class="flex items-center justify-between gap-3">
														<div class="text-slate-500">Release</div>
														<Link
															to="/release/$id"
															params={{
																id:
																	entry().detail.release?.release_id.toString()
																	?? "1",
															}}
															class="font-mono text-slate-900 no-underline hover:underline"
														>
															{entry().detail.release?.release_id}
														</Link>
													</div>
													<div class="flex items-center justify-between gap-3">
														<div class="text-slate-500">Type</div>
														<div class="font-mono text-slate-900">
															{entry().detail.release?.type}
														</div>
													</div>
												</Match>
											</Switch>
										</div>
									</div>

									<div class="rounded-sm border border-slate-200 bg-slate-50 p-4">
										<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
											AUDIT
										</div>
										<div class="mt-3 grid gap-2 text-sm">
											<div class="flex items-center justify-between gap-3">
												<div class="text-slate-500">Handled</div>
												<div class="text-slate-900">
													{formatDateTime(entry().detail.handled_at)}
												</div>
											</div>
											<div class="flex items-center justify-between gap-3">
												<div class="text-slate-500">Handled by</div>
												<div class="text-slate-900">
													<Show
														when={entry().detail.handled_by}
														fallback="—"
													>
														{entry().detail.handled_by?.name}
													</Show>
												</div>
											</div>
											<div class="flex items-center justify-between gap-3">
												<div class="text-slate-500">Reverted</div>
												<div class="text-slate-900">
													{formatDateTime(entry().detail.reverted_at)}
												</div>
											</div>
											<div class="flex items-center justify-between gap-3">
												<div class="text-slate-500">Reverted by</div>
												<div class="text-slate-900">
													<Show
														when={entry().detail.reverted_by}
														fallback="—"
													>
														{entry().detail.reverted_by?.name}
													</Show>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>

							<div class="rounded-sm border border-slate-200 bg-slate-50 p-4">
								<div class="text-[11px] font-medium tracking-[0.18em] text-slate-500">
									ACTIONS
								</div>
								<div class="mt-3">
									<Switch>
										<Match when={status() === "Pending"}>
											{pendingActions()}
										</Match>
										<Match when={status() === "Approved"}>
											{approvedActions()}
										</Match>
										<Match when={true}>
											<div class="text-sm text-slate-500">
												No actions available for this status.
											</div>
										</Match>
									</Switch>
								</div>
							</div>
						</div>
					</div>
				)}
			</Show>
		</section>
	)
}
