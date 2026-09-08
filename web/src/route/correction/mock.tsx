import * as stylex from "@stylexjs/stylex"
import { createFileRoute, useNavigate } from "@tanstack/solid-router"
import type {
	CorrectionDetail,
	CorrectionDiff,
	CorrectionHistoryItem,
	CorrectionRevisionSummary,
} from "@thc/api"
import { CorrectionQueryOption } from "@thc/query"
import { createEffect, createMemo, createSignal, For, Show } from "solid-js"
import * as v from "valibot"

import { Badge } from "~/component/atomic/Badge"
import { inputStyles } from "~/component/atomic/Input"
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
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { CorrectionDetailPage } from "~/view/correction/Detail"

const styles = stylex.create({
	selectedScenario: {
		boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
	},
	compareInput: {
		appearance: "textfield",
		WebkitAppearance: {
			default: null,
			"::-webkit-outer-spin-button": "none",
			"::-webkit-inner-spin-button": "none",
		},
		margin: {
			default: null,
			"::-webkit-outer-spin-button": 0,
			"::-webkit-inner-spin-button": 0,
		},
		height: px[36],
		paddingInline: px[8],
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
	},
	panelPosition: {
		position: "fixed",
		right: px[16],
		bottom: px[16],
		zIndex: 50,
		maxWidth: "calc(100vw - 2rem)",
	},
	panel: {
		display: "flex",
		maxWidth: "420px",
		flexDirection: "column",
		gap: px[12],
		borderRadius: radius.md,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[300],
		backgroundColor: `color-mix(in oklab, ${palette.white} 85%, transparent)`,
		padding: px[12],
		boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${palette.slate[200]} 60%, transparent), 0 30px 80px -50px rgba(0,0,0,0.35)`,
		backdropFilter: "blur(12px)",
	},
	panelHeader: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
	},
	heading: { minWidth: "0rem" },
	scenarioHeading: { display: "flex", alignItems: "center", gap: px[12] },
	eyebrow: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.18em",
		color: palette.slate[500],
	},
	subtitle: {
		marginTop: px[4],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[600],
	},
	toggle: { flexShrink: 0, paddingInline: px[8] },
	controls: { display: "flex", flexDirection: "column", gap: px[12] },
	fieldLabel: {
		fontSize: "11px",
		fontWeight: 500,
		letterSpacing: "0.22em",
		color: palette.slate[500],
	},
	scenarioOptions: {
		scrollbarWidth: "none",
		display: { default: "flex", "::-webkit-scrollbar": "none" },
		flexWrap: "wrap",
		gap: px[8],
	},
	fields: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(1, minmax(0, 1fr))",
			"@media (min-width: 40rem)": "repeat(2, minmax(0, 1fr))",
		},
		gap: px[12],
	},
	field: { display: "flex", flexDirection: "column", gap: px[6] },
	quickPicks: { display: "flex", flexWrap: "wrap", gap: px[8] },
	idButton: { paddingInline: px[12], fontFamily: fonts.mono },
	muted: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	routePath: { fontFamily: fonts.mono },
	action: { paddingInline: px[12] },
	scenarioFieldChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[6] },
	},
})

type MockScenarioData = {
	detail: CorrectionDetail
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

const BUTTON_TONE = {
	Slate: "slate",
	Blue: "blue",
	Green: "green",
	Reimu: "reimu",
	Marisa: "marisa",
	Gray: "gray",
} as const

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
			? Object.assign(item, {
					handled_at: HANDLED_AT,
				})
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
			? Object.assign(item, {
					handled_at: HANDLED_AT,
				})
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

	createEffect(() => seedCorrectionQueries(activeScenarioKey()))

	const compareIds = createMemo(() => {
		const compareEntries = Object.keys(activeScenario().data.compare)
		return compareEntries
			.map(Number)
			.filter((value) => Number.isFinite(value))
			.toSorted((a, b) => b - a)
	})

	const setScenario = (key: ScenarioKey) => {
		void navigate({
			to: "/correction/mock",
			search: (prev) => ({
				...prev,
				scenario: key,
				compare: undefined,
			}),
		})
	}

	const setCompare = (value: number | undefined) => {
		void navigate({
			to: "/correction/mock",
			search: (prev) => ({
				...prev,
				compare: value,
			}),
		})
	}

	const onCompareInputChange = (event: Event) => {
		const currentTarget = event.currentTarget
		if (!(currentTarget instanceof HTMLInputElement)) return

		const raw = currentTarget.value.trim()
		const next = raw.length > 0 ? Number(raw) : undefined
		setCompare(Number.isFinite(next ?? Number.NaN) ? next : undefined)
	}

	const toggleCollapsed = () => setCollapsed((prev) => !prev)

	const reset = () => {
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
			<div {...stylex.attrs(styles.panelPosition)}>
				<section
					aria-label="Correction mock controls"
					{...stylex.attrs(styles.panel)}
				>
					<div {...stylex.attrs(styles.panelHeader)}>
						<div {...stylex.attrs(styles.heading)}>
							<div {...stylex.attrs(styles.scenarioHeading)}>
								<div {...stylex.attrs(styles.eyebrow)}>CORRECTION LAB</div>
								<Badge color={activeScenario().tone}>
									{activeScenario().label}
								</Badge>
							</div>
							<div {...stylex.attrs(styles.subtitle)}>
								{activeScenario().caption}
							</div>
						</div>
						<Button
							aria-controls={controlPanelId}
							aria-expanded={!collapsed()}
							onClick={toggleCollapsed}
							appearance="ghost"
							tone="slate"
							size="xs"
							styles={styles.toggle}
						>
							{collapsed() ? "Expand" : "Collapse"}
						</Button>
					</div>

					<Show when={!collapsed()}>
						<div
							id={controlPanelId}
							{...stylex.attrs(styles.controls)}
						>
							<div>
								<div
									{...stylex.attrs(
										styles.fieldLabel,
										styles.scenarioFieldChild,
									)}
								>
									SCENARIO
								</div>
								<div
									{...stylex.attrs(
										styles.scenarioOptions,
										styles.scenarioFieldChild,
									)}
								>
									<For each={SCENARIOS}>
										{(item) => (
											<Button
												onClick={() => setScenario(item.key)}
												appearance={
													activeScenarioKey() === item.key ? "solid" : "soft"
												}
												tone={
													activeScenarioKey() === item.key
														? BUTTON_TONE[item.tone]
														: "slate"
												}
												size="xs"
												styles={[
													styles.action,
													activeScenarioKey() === item.key
														&& styles.selectedScenario,
												]}
											>
												{item.label}
											</Button>
										)}
									</For>
								</div>
							</div>

							<div {...stylex.attrs(styles.fields)}>
								<label {...stylex.attrs(styles.field)}>
									<div {...stylex.attrs(styles.fieldLabel)}>COMPARE ID</div>
									<input
										type="number"
										aria-label="Compare ID"
										inputmode="numeric"
										{...stylex.attrs(inputStyles.like, styles.compareInput)}
										placeholder="(empty = baseline)"
										value={search().compare ?? ""}
										onChange={onCompareInputChange}
									/>
								</label>

								<div {...stylex.attrs(styles.field)}>
									<div {...stylex.attrs(styles.fieldLabel)}>QUICK PICKS</div>
									<div {...stylex.attrs(styles.quickPicks)}>
										<Button
											onClick={() => setCompare(undefined)}
											appearance={search().compare ? "soft" : "solid"}
											tone={search().compare ? "slate" : "blue"}
											size="xs"
											styles={styles.idButton}
										>
											none
										</Button>
										<For each={compareIds()}>
											{(value) => (
												<Button
													onClick={() => setCompare(value)}
													appearance={
														search().compare === value ? "solid" : "soft"
													}
													tone={search().compare === value ? "reimu" : "slate"}
													size="xs"
													styles={styles.idButton}
												>
													#{value}
												</Button>
											)}
										</For>
										<Show when={compareIds().length === 0}>
											<span {...stylex.attrs(styles.muted)}>
												No compare baselines.
											</span>
										</Show>
									</div>
								</div>
							</div>

							<div {...stylex.attrs(styles.panelHeader)}>
								<div {...stylex.attrs(styles.muted)}>
									Route:{" "}
									<span {...stylex.attrs(styles.routePath)}>
										/correction/mock
									</span>
								</div>
								<Button
									onClick={reset}
									appearance="ghost"
									tone="slate"
									size="xs"
									styles={styles.action}
								>
									Reset
								</Button>
							</div>
						</div>
					</Show>
				</section>
			</div>

			<CorrectionDetailPage
				correctionId={MOCK_CORRECTION_ID}
				compareId={search().compare}
				onCompareIdChange={setCompare}
			/>
		</>
	)
}
