import { useQuery } from "@tanstack/solid-query"
import { useNavigate } from "@tanstack/solid-router"
import type {
	Correction,
	CorrectionDiff,
	CorrectionDiffEntry,
	CorrectionHistoryItem,
	CorrectionRevisionSummary,
	CorrectionStatus,
	CorrectionType,
	EntityType,
} from "@thc/api"
import { CorrectionQueryOption } from "@thc/query"
import { createMemo, For, Show } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Card } from "~/component/atomic/Card"
import { INPUT_LIKE_BASE_CLASS } from "~/component/atomic/Input"
import { Link } from "~/component/atomic/Link"
import { PageLayout } from "~/layout/PageLayout"

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

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
	const navigate = useNavigate({ from: "/correction/$id" })
	const correctionQuery = useQuery(() =>
		CorrectionQueryOption.detail(props.correctionId),
	)

	const activeCompareId = createMemo(() => {
		const compare = props.compareId
		if (!compare || compare === props.correctionId) return undefined
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
				queryFn: async () => [],
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

	const onCompareChange = (event: Event) => {
		const value = (event.currentTarget as HTMLSelectElement).value
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
					<div class="flex flex-col gap-8">
						<CorrectionHeader correction={correction()} />
						<Card class="space-y-4">
							<div class="flex flex-wrap items-center justify-between gap-4">
								<div class="space-y-1">
									<h2 class="text-lg font-medium">Diff View</h2>
									<p class="text-sm text-tertiary">
										Compare changes between corrections.
									</p>
								</div>
								<div class="flex flex-col gap-2">
									<label class="text-xs font-medium uppercase tracking-widest text-tertiary">
										Compare With
									</label>
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
													{formatTimestamp(item.handled_at ?? item.created_at)}
													)
												</option>
											)}
										</For>
									</select>
								</div>
							</div>
							<DiffSummary
								diff={diffQuery.data}
								isLoading={diffQuery.isLoading}
							/>
						</Card>
						<DiffList
							changes={diffQuery.data?.changes}
							isLoading={diffQuery.isLoading}
						/>
						<RevisionList
							revisions={revisionsQuery.data}
							isLoading={revisionsQuery.isLoading}
						/>
						<CorrectionHistorySection
							entityType={ENTITY_HISTORY_MAP[correction().entity_type]}
							entityId={correction().entity_id}
							currentCorrectionId={props.correctionId}
							items={historyQuery.data ?? []}
							isLoading={historyQuery.isLoading}
						/>
					</div>
				)}
			</Show>
		</PageLayout>
	)
}

type CorrectionHistorySectionProps = {
	entityType: CorrectionEntityType
	entityId: number
	currentCorrectionId?: number
	items?: CorrectionHistoryItem[]
	isLoading?: boolean
	class?: string
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
				queryFn: async () => props.items ?? [],
				enabled: false,
			}
		}

		return CorrectionQueryOption.history(props.entityType, props.entityId)
	})

	const items = () => props.items ?? historyQuery.data ?? []
	const isLoading = () => props.isLoading ?? historyQuery.isLoading

	return (
		<section class={twMerge("space-y-4", props.class)}>
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="text-lg font-medium">Corrections</h2>
				<Show when={!isLoading()}>
					<span class="text-xs text-tertiary">{items().length} items</span>
				</Show>
			</div>
			<Show
				when={!isLoading()}
				fallback={<div class="text-sm text-tertiary">Loading...</div>}
			>
				<ul class="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-primary">
					<For
						each={items()}
						fallback={
							<li class="p-4 text-sm text-tertiary">
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
										"grid gap-4 p-4 md:grid-cols-[1fr_auto] md:items-center",
										isCurrent() ? "bg-slate-50" : "",
									)}
								>
									<div class="space-y-2">
										<div class="flex flex-wrap items-center gap-2">
											<span
												class={twMerge(
													"inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs ring-1 ring-inset",
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
												<span>
													Approved {formatTimestamp(item.handled_at)}
												</span>
											</Show>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<Link
											to="/correction/$id"
											params={{ id: item.id.toString() }}
											search={
												previousId()
													? { compare: previousId() }
													: undefined
											}
											class="text-sm"
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
	const entityRoute = () => ENTITY_ROUTE_MAP[props.correction.entity_type]
	const entityLabel = () => formatEntityType(props.correction.entity_type)

	return (
		<header class="space-y-4">
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div class="space-y-2">
					<p class="text-sm text-tertiary">{entityLabel()} correction</p>
					<h1 class="text-2xl font-light tracking-tight">
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
			<div class="grid gap-4 text-sm text-secondary md:grid-cols-2">
				<div class="space-y-1">
					<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
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
					<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
						Type
					</div>
					<span>{props.correction.type}</span>
				</div>
				<div class="space-y-1">
					<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
						Created
					</div>
					<span>{formatTimestamp(props.correction.created_at)}</span>
				</div>
				<div class="space-y-1">
					<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
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

type DiffSummaryProps = {
	diff?: CorrectionDiff
	isLoading: boolean
}

function DiffSummary(props: DiffSummaryProps) {
	return (
		<Show
			when={!props.isLoading}
			fallback={<div class="text-sm text-tertiary">Loading diff...</div>}
		>
			<Show
				when={props.diff}
				fallback={<div class="text-sm text-tertiary">No diff data.</div>}
			>
				{(diff) => (
					<div class="grid gap-4 rounded-md border border-slate-200 p-4 text-sm text-secondary md:grid-cols-3">
						<div class="space-y-1">
							<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
								Changes
							</div>
							<span>{diff().changes.length} fields</span>
						</div>
						<div class="space-y-1">
							<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
								Base
							</div>
							<span>
								{diff().base_correction_id
									? `#${diff().base_correction_id}`
									: "None"}
							</span>
						</div>
						<div class="space-y-1">
							<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
								Target
							</div>
							<span>#{diff().target_correction_id}</span>
						</div>
					</div>
				)}
			</Show>
		</Show>
	)
}

type DiffListProps = {
	changes?: CorrectionDiffEntry[]
	isLoading: boolean
}

function DiffList(props: DiffListProps) {
	return (
		<section class="space-y-4">
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-lg font-medium">Changes</h2>
				<Show when={!props.isLoading}>
					<span class="text-xs text-tertiary">
						{props.changes?.length ?? 0} entries
					</span>
				</Show>
			</div>
			<Show
				when={!props.isLoading}
				fallback={<div class="text-sm text-tertiary">Loading diff...</div>}
			>
				<ul class="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-primary">
					<For
						each={props.changes ?? []}
						fallback={
							<li class="p-4 text-sm text-tertiary">
								No changes detected.
							</li>
						}
					>
						{(entry) => (
							<li class="space-y-3 p-4">
								<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
									{entry.path}
								</div>
								<div class="grid gap-3 md:grid-cols-2">
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
								</div>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</section>
	)
}

type DiffValueProps = {
	label: string
	value?: string | null
	variant: "before" | "after"
}

function DiffValue(props: DiffValueProps) {
	return (
		<div class="space-y-2">
			<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
				{props.label}
			</div>
			<div
				class={twMerge(
					"min-h-20 rounded-md border px-3 py-2 text-xs font-mono text-slate-800",
					DIFF_TONE[props.variant],
				)}
			>
				{props.value ?? "None"}
			</div>
		</div>
	)
}

type RevisionListProps = {
	revisions?: CorrectionRevisionSummary[]
	isLoading: boolean
}

function RevisionList(props: RevisionListProps) {
	return (
		<section class="space-y-4">
			<div class="flex items-center justify-between gap-3">
				<h2 class="text-lg font-medium">Revisions</h2>
				<Show when={!props.isLoading}>
					<span class="text-xs text-tertiary">
						{props.revisions?.length ?? 0} entries
					</span>
				</Show>
			</div>
			<Show
				when={!props.isLoading}
				fallback={<div class="text-sm text-tertiary">Loading revisions...</div>}
			>
				<ul class="divide-y divide-slate-200 overflow-hidden rounded-md border border-slate-200 bg-primary">
					<For
						each={props.revisions ?? []}
						fallback={
							<li class="p-4 text-sm text-tertiary">
								No revisions recorded.
							</li>
						}
					>
						{(revision, index) => (
							<li class="grid gap-2 p-4 text-sm">
								<div class="text-xs font-medium uppercase tracking-widest text-tertiary">
									Revision {index() + 1}
								</div>
								<div class="text-primary">
									{revision.description || "No description"}
								</div>
								<div class="text-xs text-tertiary">{revision.author.name}</div>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</section>
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
