import { useQuery } from "@tanstack/solid-query"
import { useNavigate } from "@tanstack/solid-router"
import type {
	Correction,
	CorrectionDiffEntry,
	CorrectionHistoryItem,
	CorrectionRevisionSummary,
	CorrectionStatus,
	CorrectionType,
	EntityType,
} from "@thc/api"
import { CorrectionQueryOption } from "@thc/query"
import { createMemo, For, Match, Show, Switch } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Card } from "~/component/atomic/Card"
import { INPUT_LIKE_BASE_CLASS } from "~/component/atomic/Input"
import { Link } from "~/component/atomic/Link"
import { PageLayout } from "~/layout/PageLayout"

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

const SECTION_CARD_CLASS =
	"overflow-hidden border border-slate-300 p-0 shadow-xs"
const SECTION_HEADER_CLASS =
	"bg-slate-50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 px-4 py-3"
const SECTION_TITLE_CLASS =
	"text-xs font-medium tracking-[0.22em] text-slate-600"

type CorrectionDetailPageProps = {
	correctionId: number
	compareId?: number | null
}

type CorrectionEntityType =
	| "artist"
	| "label"
	| "release"
	| "song"
	| "tag"
	| "event"
	| "song-lyrics"
	| "credit-role"

export function CorrectionDetailPage(props: CorrectionDetailPageProps) {
	const navigate = useNavigate()
	const correctionQuery = useQuery(() =>
		CorrectionQueryOption.detail(props.correctionId),
	)

	const activeCompareId = createMemo(() => {
		const compare = props.compareId
		if (!compare || compare === props.correctionId) return
		return compare
	})

	const diffQuery = useQuery(() => {
		const compare = activeCompareId()
		if (compare) {
			return CorrectionQueryOption.compare(compare, props.correctionId)
		}
		return CorrectionQueryOption.diff(props.correctionId)
	})

	const revisionsQuery = useQuery(() =>
		CorrectionQueryOption.revisions(props.correctionId),
	)

	const historyQuery = useQuery(() => {
		const correction = correctionQuery.data
		if (!correction) {
			return {
				queryKey: ["correction::history", "pending", props.correctionId],
				queryFn: () => [],
			}
		}

		return CorrectionQueryOption.history(
			ENTITY_HISTORY_MAP[correction.entity_type],
			correction.entity_id,
		)
	})

	const compareOptions = createMemo(() => {
		const items = historyQuery.data ?? []
		return items.filter((item) => item.id !== props.correctionId)
	})

	let onCompareChange = (event: Event) => {
		const currentTarget = event.currentTarget
		if (!(currentTarget instanceof HTMLSelectElement)) return

		const value = currentTarget.value
		const next = value ? Number(value) : undefined
		void navigate({
			search: (prev) => ({
				...prev,
				compare: next,
			}),
		})
	}

	return (
		<PageLayout class="p-8">
			<Show
				when={correctionQuery.data}
				fallback={<div class="text-sm text-tertiary">Loading...</div>}
			>
				{(correction) => (
					<div class="flex flex-col gap-6">
						<CorrectionHeader correction={correction()} />
						<Card class={SECTION_CARD_CLASS}>
							<div class={SECTION_HEADER_CLASS}>
								<div class="min-w-0 space-y-1">
									<div class={SECTION_TITLE_CLASS}>DIFF</div>
									<Switch>
										<Match when={diffQuery.isLoading}>
											<div class="text-xs text-tertiary">Loading...</div>
										</Match>
										<Match when={!diffQuery.data}>
											<div class="text-xs text-tertiary">No diff data.</div>
										</Match>
										<Match when={true}>
											<div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-tertiary">
												<span class="text-primary">
													<span class="font-medium">
														{diffQuery.data?.changes.length ?? 0}
													</span>{" "}
													fields
												</span>
												<span class="text-slate-300">·</span>
												<span class="font-mono">
													{diffQuery.data?.base_correction_id
														? `#${diffQuery.data.base_correction_id}`
														: "none"}{" "}
													→ #{diffQuery.data?.target_correction_id}
												</span>
											</div>
										</Match>
									</Switch>
								</div>

								<label class="flex flex-wrap items-center gap-2">
									<span class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
										COMPARE
									</span>
									<select
										class={twMerge(
											INPUT_LIKE_BASE_CLASS,
											"h-9 min-w-52 px-2 text-sm",
										)}
										value={activeCompareId() ?? ""}
										onChange={onCompareChange}
									>
										<option value="">Previous approved baseline</option>
										<For each={compareOptions()}>
											{(item) => (
												<option value={item.id}>
													#{item.id} {item.type} (
													{formatTimestamp(item.handled_at ?? item.created_at)})
												</option>
											)}
										</For>
									</select>
								</label>
							</div>

							<DiffEntries
								changes={diffQuery.data?.changes}
								isLoading={diffQuery.isLoading}
							/>
						</Card>

						<div class="grid gap-6 lg:grid-cols-2">
							<Card class={SECTION_CARD_CLASS}>
								<div class={SECTION_HEADER_CLASS}>
									<div class={SECTION_TITLE_CLASS}>REVISIONS</div>
									<Show when={!revisionsQuery.isLoading}>
										<span class="font-mono text-xs text-slate-400">
											{revisionsQuery.data?.length ?? 0} items
										</span>
									</Show>
								</div>
								<RevisionEntries
									revisions={revisionsQuery.data}
									isLoading={revisionsQuery.isLoading}
								/>
							</Card>

							<Card class={SECTION_CARD_CLASS}>
								<div class={SECTION_HEADER_CLASS}>
									<div class={SECTION_TITLE_CLASS}>CORRECTIONS</div>
									<Show when={!historyQuery.isLoading}>
										<span class="font-mono text-xs text-slate-400">
											{historyQuery.data?.length ?? 0} items
										</span>
									</Show>
								</div>
								<CorrectionHistorySection
									entityType={ENTITY_HISTORY_MAP[correction().entity_type]}
									entityId={correction().entity_id}
									currentCorrectionId={props.correctionId}
									items={historyQuery.data ?? []}
									isLoading={historyQuery.isLoading}
									hideHeader
									density="compact"
									embedded
								/>
							</Card>
						</div>
					</div>
				)}
			</Show>
		</PageLayout>
	)
}

type DiffEntriesProps = {
	changes?: CorrectionDiffEntry[]
	isLoading: boolean
}

function DiffEntries(props: DiffEntriesProps) {
	let entries = () => props.changes ?? []

	return (
		<Switch>
			<Match when={props.isLoading}>
				<div class="px-4 py-3 text-sm text-tertiary">Loading diff...</div>
			</Match>
			<Match when={entries().length === 0}>
				<div class="px-4 py-3 text-sm text-tertiary">No changes detected.</div>
			</Match>
			<Match when={true}>
				<div>
					<div class="hidden border-b border-slate-200 md:grid md:grid-cols-[12rem_1fr_1fr] md:gap-3 md:px-4 md:py-2">
						<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
							FIELD
						</div>
						<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
							BEFORE
						</div>
						<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
							AFTER
						</div>
					</div>
					<ul class="divide-y divide-slate-200">
						<For each={entries()}>
							{(entry) => (
								<li class="grid gap-3 px-4 py-3 md:grid-cols-[12rem_1fr_1fr] md:items-start">
									<div class="min-w-0">
										<div
											class="truncate font-mono text-xs text-secondary"
											title={entry.path}
										>
											{entry.path}
										</div>
									</div>
									<DiffValue
										label="Before"
										value={entry.before}
										variant="before"
									/>
									<DiffValue
										label="After"
										value={entry.after}
										variant="after"
									/>
								</li>
							)}
						</For>
					</ul>
				</div>
			</Match>
		</Switch>
	)
}

type DiffValueProps = {
	label: string
	value?: string | null
	variant: "before" | "after"
}

function DiffValue(props: DiffValueProps) {
	return (
		<div class="space-y-1">
			<div class="text-[11px] font-medium tracking-widest text-tertiary uppercase md:hidden">
				{props.label}
			</div>
			<pre
				class={twMerge(
					"min-h-12 rounded-md border px-3 py-2 font-mono text-xs leading-5 break-words whitespace-pre-wrap text-slate-800",
					DIFF_TONE[props.variant],
				)}
			>
				{props.value ?? "None"}
			</pre>
		</div>
	)
}

type RevisionEntriesProps = {
	revisions?: CorrectionRevisionSummary[]
	isLoading: boolean
}

function RevisionEntries(props: RevisionEntriesProps) {
	let entries = () => props.revisions ?? []

	return (
		<Switch>
			<Match when={props.isLoading}>
				<div class="px-4 py-3 text-sm text-tertiary">Loading revisions...</div>
			</Match>
			<Match when={entries().length === 0}>
				<div class="px-4 py-3 text-sm text-tertiary">
					No revisions recorded.
				</div>
			</Match>
			<Match when={true}>
				<ul class="divide-y divide-slate-200">
					<For each={entries()}>
						{(revision, index) => (
							<li class="grid gap-1 px-4 py-3 text-sm">
								<div class="flex flex-wrap items-center justify-between gap-2">
									<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
										REVISION {index() + 1}
									</div>
									<div class="text-xs text-tertiary">
										{revision.author.name}
									</div>
								</div>
								<div class="text-sm text-primary">
									{revision.description || "No description"}
								</div>
							</li>
						)}
					</For>
				</ul>
			</Match>
		</Switch>
	)
}

type CorrectionHistorySectionProps = {
	entityType: CorrectionEntityType
	entityId: number
	currentCorrectionId?: number
	items?: CorrectionHistoryItem[]
	isLoading?: boolean
	class?: string
	hideHeader?: boolean
	density?: "comfortable" | "compact"
	embedded?: boolean
}

export function CorrectionHistorySection(props: CorrectionHistorySectionProps) {
	const historyQuery = useQuery(() => {
		if (props.items) {
			return {
				queryKey: [
					"correction::history",
					"static",
					props.entityType,
					props.entityId,
				],
				queryFn: () => props.items ?? [],
				enabled: false,
			}
		}

		return CorrectionQueryOption.history(props.entityType, props.entityId)
	})

	const items = () => props.items ?? historyQuery.data ?? []
	const isLoading = () => props.isLoading ?? historyQuery.isLoading
	const isCompact = () => props.density === "compact"
	const listClass = () =>
		props.embedded
			? "divide-y divide-slate-200"
			: "divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-primary"

	return (
		<section
			class={twMerge(isCompact() ? "space-y-2" : "space-y-4", props.class)}
		>
			<Show when={!props.hideHeader}>
				<div class="flex flex-wrap items-center justify-between gap-3">
					<Show
						when={!isCompact()}
						fallback={
							<div class="text-xs font-medium tracking-widest text-tertiary uppercase">
								Corrections
							</div>
						}
					>
						<h2 class="text-lg font-medium">Corrections</h2>
					</Show>
					<Show when={!isLoading()}>
						<span class="text-xs text-tertiary">{items().length} items</span>
					</Show>
				</div>
			</Show>
			<Show
				when={!isLoading()}
				fallback={<div class="text-sm text-tertiary">Loading...</div>}
			>
				<ul class={listClass()}>
					<For
						each={items()}
						fallback={
							<li
								class={twMerge(
									isCompact() ? "px-4 py-3" : "p-4",
									"text-sm text-tertiary",
								)}
							>
								No corrections yet.
							</li>
						}
					>
						{(item, index) => {
							const previousId = () => items()[index() + 1]?.id
							const isCurrent = () => item.id === props.currentCorrectionId
							return (
								<li
									class={twMerge(
										isCompact()
											? "grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center"
											: "grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center",
										isCurrent() ? "bg-slate-50" : "",
									)}
								>
									<div class={isCompact() ? "space-y-1" : "space-y-2"}>
										<div class="flex flex-wrap items-center gap-2">
											<span
												class={twMerge(
													isCompact()
														? "inline-flex items-center gap-2 rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset"
														: "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
													TYPE_TONE[item.type],
												)}
											>
												{item.type}
											</span>
											<span class="text-xs text-tertiary">#{item.id}</span>
											<Show when={isCurrent()}>
												<span class="text-xs text-reimu-700">Current</span>
											</Show>
										</div>
										<p class="text-sm text-primary">
											{item.description || "No description"}
										</p>
										<div class="text-xs text-tertiary">
											<span>{item.author.name}</span>
											<span class="mx-2 text-slate-300">|</span>
											<span>{formatTimestamp(item.created_at)}</span>
											<Show when={item.handled_at}>
												<span class="mx-2 text-slate-300">|</span>
												<span>Approved {formatTimestamp(item.handled_at)}</span>
											</Show>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<Link
											to="/correction/$id"
											params={{ id: item.id.toString() }}
											search={
												previousId() ? { compare: previousId() } : undefined
											}
											class={isCompact() ? "text-xs" : "text-sm"}
										>
											View diff
										</Link>
									</div>
								</li>
							)
						}}
					</For>
				</ul>
			</Show>
		</section>
	)
}

type CorrectionHeaderProps = {
	correction: Correction
}

function CorrectionHeader(props: CorrectionHeaderProps) {
	let entityRoute = () => ENTITY_ROUTE_MAP[props.correction.entity_type]
	let entityLabel = () => formatEntityType(props.correction.entity_type)

	return (
		<header class="space-y-4">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="space-y-1">
					<p class="text-sm text-tertiary">{entityLabel()} correction</p>
					<h1 class="text-2xl font-light tracking-tight text-primary">
						Correction #{props.correction.id}
					</h1>
				</div>
				<span
					class={twMerge(
						"inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset",
						STATUS_TONE[props.correction.status],
					)}
				>
					{props.correction.status}
				</span>
			</div>

			<div class="grid gap-3 text-sm text-secondary md:grid-cols-2">
				<div class="space-y-1">
					<div class="text-xs font-medium tracking-widest text-tertiary uppercase">
						Entity
					</div>
					<Show
						when={entityRoute()}
						fallback={
							<span>
								{entityLabel()} #{props.correction.entity_id}
							</span>
						}
					>
						{(route) => (
							<Link
								to={route()}
								params={{ id: props.correction.entity_id.toString() }}
							>
								{entityLabel()} #{props.correction.entity_id}
							</Link>
						)}
					</Show>
				</div>
				<div class="space-y-1">
					<div class="text-xs font-medium tracking-widest text-tertiary uppercase">
						Type
					</div>
					<span>{props.correction.type}</span>
				</div>
				<div class="space-y-1">
					<div class="text-xs font-medium tracking-widest text-tertiary uppercase">
						Created
					</div>
					<span>{formatTimestamp(props.correction.created_at)}</span>
				</div>
				<div class="space-y-1">
					<div class="text-xs font-medium tracking-widest text-tertiary uppercase">
						Handled
					</div>
					<span>
						{props.correction.handled_at
							? formatTimestamp(props.correction.handled_at)
							: "Not handled"}
					</span>
				</div>
			</div>
		</header>
	)
}

const STATUS_TONE: Record<CorrectionStatus, string> = {
	Pending: "bg-slate-100 text-slate-700 ring-slate-200",
	Approved: "bg-green-100 text-green-700 ring-green-200",
	Rejected: "bg-reimu-100 text-reimu-700 ring-reimu-200",
}

const TYPE_TONE: Record<CorrectionType, string> = {
	Create: "bg-green-100 text-green-700 ring-green-200",
	Update: "bg-blue-100 text-blue-700 ring-blue-200",
	Delete: "bg-reimu-100 text-reimu-700 ring-reimu-200",
}

const DIFF_TONE = {
	before: "bg-reimu-100 border-reimu-200",
	after: "bg-green-100 border-green-200",
}

const ENTITY_HISTORY_MAP: Record<EntityType, CorrectionEntityType> = {
	Artist: "artist",
	Label: "label",
	Release: "release",
	Song: "song",
	Tag: "tag",
	Event: "event",
	SongLyrics: "song-lyrics",
	CreditRole: "credit-role",
}

const ENTITY_ROUTE_MAP: Partial<Record<EntityType, string>> = {
	Artist: "/artist/$id",
	Label: "/label/$id",
	Release: "/release/$id",
	Song: "/song/$id",
	Tag: "/tag/$id",
	Event: "/event/$id",
}

function formatEntityType(entityType: EntityType) {
	if (entityType === "SongLyrics") return "Song lyrics"
	if (entityType === "CreditRole") return "Credit role"
	return entityType
}

function formatTimestamp(value?: string | null) {
	if (!value) return "None"
	const date = new Date(value)
	if (Number.isNaN(date.valueOf())) return value
	return DATE_FORMAT.format(date)
}
