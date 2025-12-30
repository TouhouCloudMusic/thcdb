import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import type {
	Correction,
	CorrectionDiff,
	CorrectionHistoryItem,
	CorrectionRevisionSummary,
} from "@thc/api"
import { CorrectionQueryOption } from "@thc/query"
import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import { twMerge } from "tailwind-merge"
import * as v from "valibot"

import { Badge } from "~/component/atomic/Badge"
import { INPUT_LIKE_BASE_CLASS } from "~/component/atomic/Input"
import { Button } from "~/component/atomic/button"
import {
	MOCK_CORRECTION_COMPARE,
	MOCK_CORRECTION_DETAIL,
	MOCK_CORRECTION_DIFF,
	MOCK_CORRECTION_HISTORY,
	MOCK_CORRECTION_HISTORY_ENTITY_TYPE,
	MOCK_CORRECTION_ID,
	MOCK_CORRECTION_REVISIONS,
} from "~/mock/correction"
import { QUERY_CLIENT } from "~/state/tanstack"
import { CorrectionDetailPage } from "~/view/correction/Detail"

type MockScenarioData = {
	detail: Correction
	diff: CorrectionDiff
	revisions: CorrectionRevisionSummary[]
	history: CorrectionHistoryItem[]
	compare: Record<number, CorrectionDiff>
}

const SCENARIO_KEYS = [
	"pending_update",
	"approved_update",
	"rejected_update",
	"approved_create",
	"rejected_delete",
] as const

type ScenarioKey = (typeof SCENARIO_KEYS)[number]

type MockScenario = {
	key: ScenarioKey
	label: string
	caption: string
	tone: "Slate" | "Blue" | "Green" | "Reimu" | "Marisa" | "Gray"
	data: MockScenarioData
}

const HANDLED_AT = "2025-12-30T12:05:00+08:00"

const PENDING_UPDATE: MockScenarioData = {
	detail: {
		...MOCK_CORRECTION_DETAIL,
		status: "Pending",
		type: "Update",
		handled_at: null,
	},
	diff: MOCK_CORRECTION_DIFF,
	revisions: MOCK_CORRECTION_REVISIONS,
	history: MOCK_CORRECTION_HISTORY,
	compare: MOCK_CORRECTION_COMPARE,
}

const APPROVED_UPDATE: MockScenarioData = {
	...PENDING_UPDATE,
	detail: {
		...PENDING_UPDATE.detail,
		status: "Approved",
		handled_at: HANDLED_AT,
	},
	history: MOCK_CORRECTION_HISTORY.map((item) =>
		item.id === MOCK_CORRECTION_ID
			? {
					...item,
					handled_at: HANDLED_AT,
				}
			: item,
	),
}

const REJECTED_UPDATE: MockScenarioData = {
	...PENDING_UPDATE,
	detail: {
		...PENDING_UPDATE.detail,
		status: "Rejected",
		handled_at: HANDLED_AT,
	},
	history: MOCK_CORRECTION_HISTORY.map((item) =>
		item.id === MOCK_CORRECTION_ID
			? {
					...item,
					handled_at: HANDLED_AT,
				}
			: item,
	),
}

const APPROVED_CREATE: MockScenarioData = {
	...PENDING_UPDATE,
	detail: {
		...PENDING_UPDATE.detail,
		status: "Approved",
		type: "Create",
		handled_at: HANDLED_AT,
	},
	diff: {
		...PENDING_UPDATE.diff,
		base_correction_id: null,
		base_history_id: null,
		changes: [
			{
				path: "name",
				before: null,
				after: "ZUN (Team Shanghai Alice)",
			},
			{
				path: "localized_names[ja]",
				before: null,
				after: "上海アリス幻樂団",
			},
			{
				path: "links",
				before: null,
				after: '["https://example.com", "https://twitter.com/placeholder"]',
			},
		],
	},
	history: [
		{
			id: MOCK_CORRECTION_ID,
			type: "Create",
			created_at: PENDING_UPDATE.detail.created_at,
			handled_at: HANDLED_AT,
			description: "Initial artist entry with localized names and links.",
			author: {
				id: 7,
				name: "Kaze Ito",
			},
		},
	],
	compare: {},
}

const REJECTED_DELETE: MockScenarioData = {
	...PENDING_UPDATE,
	detail: {
		...PENDING_UPDATE.detail,
		status: "Rejected",
		type: "Delete",
		handled_at: HANDLED_AT,
	},
	diff: {
		...PENDING_UPDATE.diff,
		changes: [
			{
				path: "name",
				before: "ZUN (Team Shanghai Alice)",
				after: null,
			},
			{
				path: "profile_image_url",
				before: "/artist/zun.png",
				after: null,
			},
			{
				path: "links",
				before: '["https://example.com", "https://twitter.com/placeholder"]',
				after: null,
			},
		],
	},
}

const SCENARIOS = [
	{
		key: "pending_update",
		label: "Pending · Update",
		caption: "Default baseline: compare + history + revisions.",
		tone: "Slate",
		data: PENDING_UPDATE,
	},
	{
		key: "approved_update",
		label: "Approved · Update",
		caption: "Header + status tone after handling.",
		tone: "Green",
		data: APPROVED_UPDATE,
	},
	{
		key: "rejected_update",
		label: "Rejected · Update",
		caption: "Failure state styling + handled timestamp.",
		tone: "Reimu",
		data: REJECTED_UPDATE,
	},
	{
		key: "approved_create",
		label: "Approved · Create",
		caption: "No baseline: before = null (new entity).",
		tone: "Blue",
		data: APPROVED_CREATE,
	},
	{
		key: "rejected_delete",
		label: "Rejected · Delete",
		caption: "After = null (attempted removals).",
		tone: "Marisa",
		data: REJECTED_DELETE,
	},
] satisfies [MockScenario, ...MockScenario[]]

const DEFAULT_SCENARIO_KEY = SCENARIO_KEYS[0]

const searchSchema = v.object({
	compare: v.optional(v.number()),
	scenario: v.optional(v.picklist(SCENARIO_KEYS)),
})

export const Route = createFileRoute("/correction/mock")({
	component: RouteComponent,
	validateSearch: searchSchema,
})

function seedCorrectionQueries(scenarioKey?: ScenarioKey) {
	const activeScenario =
		SCENARIOS.find((scenario) => scenario.key === scenarioKey) ?? SCENARIOS[0]

	QUERY_CLIENT.setQueryData(
		CorrectionQueryOption.detail(MOCK_CORRECTION_ID).queryKey,
		activeScenario.data.detail,
	)
	QUERY_CLIENT.setQueryData(
		CorrectionQueryOption.diff(MOCK_CORRECTION_ID).queryKey,
		activeScenario.data.diff,
	)
	QUERY_CLIENT.setQueryData(
		CorrectionQueryOption.revisions(MOCK_CORRECTION_ID).queryKey,
		activeScenario.data.revisions,
	)
	QUERY_CLIENT.setQueryData(
		CorrectionQueryOption.history(
			MOCK_CORRECTION_HISTORY_ENTITY_TYPE,
			activeScenario.data.detail.entity_id,
		).queryKey,
		activeScenario.data.history,
	)

	const compareEntries = Object.entries(activeScenario.data.compare)
	for (const [compareIdRaw, diff] of compareEntries) {
		const compareId = Number(compareIdRaw)
		QUERY_CLIENT.setQueryData(
			CorrectionQueryOption.compare(compareId, MOCK_CORRECTION_ID).queryKey,
			diff,
		)
	}
}

function RouteComponent() {
	const search = Route.useSearch()
	const navigate = useNavigate()
	const [collapsed, setCollapsed] = createSignal(false)
	const controlPanelId = "correction-mock-controls"

	const activeScenarioKey = createMemo<ScenarioKey>(() => {
		const scenario = search().scenario
		if (scenario) return scenario
		return DEFAULT_SCENARIO_KEY
	})

	const activeScenario = createMemo(
		() =>
			SCENARIOS.find((scenario) => scenario.key === activeScenarioKey())
			?? SCENARIOS[0],
	)

	seedCorrectionQueries(activeScenarioKey())
	createEffect(() => seedCorrectionQueries(activeScenarioKey()))

	const compareIds = createMemo(() => {
		const compareEntries = Object.keys(activeScenario().data.compare)
		return compareEntries
			.map((value) => Number(value))
			.filter((value) => Number.isFinite(value))
			.toSorted((a, b) => b - a)
	})

	let setScenario = (key: ScenarioKey) => {
		void navigate({
			to: "/correction/mock",
			search: (prev) => ({
				...prev,
				scenario: key,
				compare: undefined,
			}),
		})
	}

	let setCompare = (value: number | undefined) => {
		void navigate({
			to: "/correction/mock",
			search: (prev) => ({
				...prev,
				compare: value,
			}),
		})
	}

	let onCompareInputChange = (event: Event) => {
		const currentTarget = event.currentTarget
		if (!(currentTarget instanceof HTMLInputElement)) return

		const raw = currentTarget.value.trim()
		const next = raw ? Number(raw) : undefined
		setCompare(Number.isFinite(next ?? Number.NaN) ? next : undefined)
	}

	let toggleCollapsed = () => setCollapsed((prev) => !prev)

	let reset = () => {
		void navigate({
			to: "/correction/mock",
			search: () => ({
				scenario: DEFAULT_SCENARIO_KEY,
				compare: undefined,
			}),
		})
	}

	return (
		<>
			<div class="fixed right-4 bottom-4 z-50 max-w-[calc(100vw-2rem)]">
				<div
					role="region"
					aria-label="Correction mock controls"
					class="flex max-w-[420px] flex-col gap-3 rounded-md border border-slate-300 bg-white/85 p-3 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.35)] ring-1 ring-slate-200/60 backdrop-blur-md ring-inset"
				>
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<div class="flex items-center gap-3">
								<div class="text-xs font-medium tracking-[0.18em] text-slate-500">
									CORRECTION LAB
								</div>
								<Badge color={activeScenario().tone}>
									{activeScenario().label}
								</Badge>
							</div>
							<div class="mt-1 text-xs text-slate-600">
								{activeScenario().caption}
							</div>
						</div>
						<Button
							size="Xs"
							variant="Tertiary"
							color="Slate"
							class="shrink-0 px-2"
							aria-controls={controlPanelId}
							aria-expanded={!collapsed()}
							onClick={toggleCollapsed}
						>
							{collapsed() ? "Expand" : "Collapse"}
						</Button>
					</div>

					<Show when={!collapsed()}>
						<div
							id={controlPanelId}
							class="flex flex-col gap-3"
						>
							<div class="space-y-1.5">
								<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
									SCENARIO
								</div>
								<div class="hide-scrollbar flex flex-wrap gap-2">
									<For each={SCENARIOS}>
										{(item) => (
											<Button
												size="Xs"
												variant={
													activeScenarioKey() === item.key
														? "Primary"
														: "Secondary"
												}
												color={
													activeScenarioKey() === item.key ? item.tone : "Slate"
												}
												class={twMerge(
													"px-3",
													activeScenarioKey() === item.key && "shadow-sm",
												)}
												onClick={() => setScenario(item.key)}
											>
												{item.label}
											</Button>
										)}
									</For>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
								<label class="flex flex-col gap-1.5">
									<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
										COMPARE ID
									</div>
									<input
										type="number"
										inputmode="numeric"
										class={twMerge(
											INPUT_LIKE_BASE_CLASS,
											"no-spinner h-9 px-2 font-mono text-xs",
										)}
										placeholder="(empty = baseline)"
										value={search().compare ?? ""}
										onChange={onCompareInputChange}
									/>
								</label>

								<div class="flex flex-col gap-1.5">
									<div class="text-[11px] font-medium tracking-[0.22em] text-slate-500">
										QUICK PICKS
									</div>
									<div class="flex flex-wrap gap-2">
										<Button
											size="Xs"
											variant={search().compare ? "Secondary" : "Primary"}
											color={search().compare ? "Slate" : "Blue"}
											class="px-3 font-mono"
											onClick={() => setCompare(undefined)}
										>
											none
										</Button>
										<For each={compareIds()}>
											{(value) => (
												<Button
													size="Xs"
													variant={
														search().compare === value ? "Primary" : "Secondary"
													}
													color={search().compare === value ? "Reimu" : "Slate"}
													class="px-3 font-mono"
													onClick={() => setCompare(value)}
												>
													#{value}
												</Button>
											)}
										</For>
										<Show when={compareIds().length === 0}>
											<span class="text-xs text-slate-500">
												No compare baselines.
											</span>
										</Show>
									</div>
								</div>
							</div>

							<div class="flex items-center justify-between gap-3">
								<div class="text-xs text-slate-500">
									Route: <span class="font-mono">/correction/mock</span>
								</div>
								<Button
									size="Xs"
									variant="Tertiary"
									color="Slate"
									class="px-3"
									onClick={reset}
								>
									Reset
								</Button>
							</div>
						</div>
					</Show>
				</div>
			</div>

			<CorrectionDetailPage
				correctionId={MOCK_CORRECTION_ID}
				compareId={search().compare}
			/>
		</>
	)
}
