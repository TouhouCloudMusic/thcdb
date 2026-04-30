import { useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type {
	Correction,
	CorrectionDiffEntry,
	CorrectionRevisionSummary,
	CorrectionStatus,
} from "@thc/api"
import { CorrectionQueryOption } from "@thc/query"
import { createMemo, For, Match, Show, Switch } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Card } from "~/component/atomic/Card"
import { INPUT_LIKE_BASE_CLASS } from "~/component/atomic/Input"
import { Link } from "~/component/atomic/Link"
import { Select } from "~/component/atomic/form/select"
import { PageLayout } from "~/layout/PageLayout"
import { formatTimestamp } from "~/utils/dateTime"

import { CorrectionHistorySection } from "./CorrectionHistorySection"
import {
	ENTITY_HISTORY_MAP,
	ENTITY_ROUTE_MAP,
	formatEntityType,
} from "./entityMap"

const STATUS_TONE: Record<CorrectionStatus, string> = {
	Pending: "bg-slate-100 text-slate-700 ring-slate-200",
	Approved: "bg-green-100 text-green-700 ring-green-200",
	Rejected: "bg-reimu-100 text-reimu-700 ring-reimu-200",
}

type CorrectionHeaderProps = {
	correction: Correction
}

function CorrectionHeader(props: CorrectionHeaderProps) {
	const { t } = useLingui()
	const entityRoute = () => ENTITY_ROUTE_MAP[props.correction.entity_type]
	const entityTypeLabels = () => ({
		songLyrics: t`Song lyrics`,
		creditRole: t`Credit role`,
	})
	const entityLabel = () =>
		formatEntityType(props.correction.entity_type, entityTypeLabels())

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
					<span>{formatTimestamp(props.correction.created_at, t`None`)}</span>
				</div>
				<div class="space-y-1">
					<div class="text-xs font-medium tracking-widest text-tertiary uppercase">
						Handled
					</div>
					<span>
						{props.correction.handled_at
							? formatTimestamp(props.correction.handled_at, t`None`)
							: t`Not handled`}
					</span>
				</div>
			</div>
		</header>
	)
}

const DIFF_TONE = {
	before: "bg-reimu-100 border-reimu-200",
	after: "bg-green-100 border-green-200",
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

type DiffEntriesProps = {
	changes?: CorrectionDiffEntry[]
	isLoading: boolean
}

function DiffEntries(props: DiffEntriesProps) {
	const { t } = useLingui()
	const entries = () => props.changes ?? []

	return (
		<Switch>
			<Match when={props.isLoading}>
				<div class="px-4 py-3 text-sm text-tertiary">{t`Loading diff...`}</div>
			</Match>
			<Match when={entries().length === 0}>
				<div class="px-4 py-3 text-sm text-tertiary">
					{t`No changes detected.`}
				</div>
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
										label={t`Before`}
										value={entry.before}
										variant="before"
									/>
									<DiffValue
										label={t`After`}
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

type RevisionEntriesProps = {
	revisions?: CorrectionRevisionSummary[]
	isLoading: boolean
}

function RevisionEntries(props: RevisionEntriesProps) {
	const { t } = useLingui()
	const entries = () => props.revisions ?? []

	return (
		<Switch>
			<Match when={props.isLoading}>
				<div class="px-4 py-3 text-sm text-tertiary">
					{t`Loading revisions...`}
				</div>
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

const SECTION_CARD_CLASS =
	"overflow-hidden border border-slate-300 p-0 shadow-xs"
const SECTION_HEADER_CLASS =
	"bg-slate-50 flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 px-4 py-3"
const SECTION_TITLE_CLASS =
	"text-xs font-medium tracking-[0.22em] text-slate-600"

type CorrectionDetailPageProps = {
	correctionId: number
	compareId?: number | null
	onCompareIdChange: (value: number | undefined) => void
}

export function CorrectionDetailPage(props: CorrectionDetailPageProps) {
	const { t } = useLingui()
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

	const compareSelectOptions = createMemo(() => [
		"",
		...compareOptions().map((item) => item.id.toString()),
	])

	const getCompareLabel = (value: string) => {
		if (value === "") return t`Previous approved baseline`
		const target = compareOptions().find((item) => item.id.toString() === value)
		if (!target) return value
		return `#${target.id} ${target.type} (${formatTimestamp(target.handled_at ?? target.created_at, t`None`)})`
	}

	return (
		<PageLayout class="p-8">
			<Show
				when={correctionQuery.data}
				fallback={<div class="text-sm text-tertiary">{t`Loading...`}</div>}
			>
				{(correction) => (
					<div class="flex flex-col gap-6">
						<CorrectionHeader correction={correction()} />
						<Card class={SECTION_CARD_CLASS}>
							<div class={SECTION_HEADER_CLASS}>
								<div class="min-w-0 space-y-1">
									<div class={SECTION_TITLE_CLASS}>{t`DIFF`}</div>
									<Switch>
										<Match when={diffQuery.isLoading}>
											<div class="text-xs text-tertiary">{t`Loading...`}</div>
										</Match>
										<Match when={!diffQuery.data}>
											<div class="text-xs text-tertiary">
												{t`No diff data.`}
											</div>
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
									<Select.Root<string>
										options={compareSelectOptions()}
										value={(activeCompareId() ?? "").toString()}
										onChange={(value) => {
											const next = value ? Number(value) : undefined
											props.onCompareIdChange(next)
										}}
										itemComponent={(itemProps) => (
											<Select.Item item={itemProps.item}>
												{getCompareLabel(itemProps.item.rawValue)}
											</Select.Item>
										)}
									>
										<Select.Trigger
											class={twMerge(
												INPUT_LIKE_BASE_CLASS,
												"h-9 min-w-52 px-2 text-sm",
											)}
										>
											<Select.Value<string>>
												{(state) => getCompareLabel(state.selectedOption())}
											</Select.Value>
											<Select.Icon />
										</Select.Trigger>
										<Select.Portal>
											<Select.Content>
												<Select.Listbox />
											</Select.Content>
										</Select.Portal>
									</Select.Root>
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
									<div class={SECTION_TITLE_CLASS}>{t`REVISIONS`}</div>
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
									<div class={SECTION_TITLE_CLASS}>{t`CORRECTIONS`}</div>
									<Show when={!historyQuery.isLoading}>
										<span class="font-mono text-xs text-slate-400">
											{historyQuery.data?.length ?? 0} items
										</span>
									</Show>
								</div>
								<CorrectionHistorySection
									currentCorrectionId={props.correctionId}
									items={historyQuery.data}
								/>
							</Card>
						</div>
					</div>
				)}
			</Show>
		</PageLayout>
	)
}
