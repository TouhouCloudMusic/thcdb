import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { Link, getRouteApi, useNavigate } from "@tanstack/solid-router"
import { StrExt } from "@thc/toolkit/data"
import { createMemo, For, Match, Show, Switch } from "solid-js"

import { Badge } from "~/component/atomic/Badge"
import { Select } from "~/component/atomic/form/select"
import { StickyFilterBar } from "~/component/feature/entity_explore"
import type {
	CursorResponsePendingImageQueueItem,
	ImageQueueStatus,
	ImageQueueType,
} from "~/hey-api"
import {
	pendingImageQueueCountOptions,
	pendingImageQueueInfiniteOptions,
} from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { createInfiniteScroll } from "~/utils/solid/createInfiniteScroll"
import { useScrollDirection } from "~/utils/solid/useScrollDirection"

import { animationStyles } from "../../style/animations.stylex"

const styles = stylex.create({
	page: { display: "flex", flexDirection: "column", padding: px[32] },
	header: { display: "flex", flexDirection: "column", rowGap: px[8] },
	eyebrow: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.2em",
		color: colors.textTertiary,
	},
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	panel: { borderRadius: radius.sm, backgroundColor: palette.white },
	filterBar: { borderColor: palette.slate[300] },
	filters: { display: "flex", columnGap: px[16] },
	filter: { display: "flex", alignItems: "center", gap: px[8] },
	label: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	typeSelect: { minWidth: px[96] },
	selectTrigger: { width: "100%" },
	queueList: { paddingTop: px[8] },
	error: {
		padding: px[24],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.reimu[700],
	},
	emptyState: { padding: px[40] },
	emptyTitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: colors.textPrimary,
	},
	emptyDescription: {
		marginTop: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	progress: { height: px[4] },
	listEnd: {
		borderTopStyle: "solid",
		borderTopWidth: "1px",
		borderColor: palette.slate[200],
		paddingInline: px[16],
		paddingBlock: px[32],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	queueRow: {
		position: "relative",
		borderRadius: radius.sm,
		isolation: "isolate",
	},
	rowLink: {
		position: "absolute",
		inset: "0rem",
		borderRadius: radius.sm,
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	rowContent: {
		pointerEvents: "none",
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gridTemplateRows: "repeat(2, minmax(0, 1fr))",
		rowGap: px[8],
		paddingInline: px[4],
		paddingBlock: px[16],
	},
	identity: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridTemplateRows: "subgrid",
		gridRow: "span 2 / span 2",
	},
	identityHeader: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		gap: px[8],
	},
	queueId: {
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	status: { paddingInline: px[8], paddingBlock: px[2] },
	entityLink: {
		pointerEvents: "auto",
		position: "relative",
		zIndex: 10,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
		width: "fit-content",
		height: "fit-content",
	},
	timestamps: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridTemplateRows: "subgrid",
		justifyItems: "end",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[600],
		gridRow: "span 2 / span 2",
	},
	skeletonRow: {
		display: "grid",
		gap: px[12],
		paddingInline: px[16],
		paddingBlock: px[16],
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 48rem)": "minmax(0,1fr) 11rem",
		},
		alignItems: { default: null, "@media (min-width: 48rem)": "center" },
	},
	skeletonTitle: {
		height: px[20],
		width: px[160],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonDescription: {
		marginTop: px[8],
		height: px[16],
		width: px[224],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	skeletonMetadata: {
		display: { default: "flex", "@media (min-width: 48rem)": "block" },
		justifyContent: "space-between",
		gap: px[12],
		textAlign: { default: null, "@media (min-width: 48rem)": "right" },
	},
	skeletonDate: {
		marginLeft: "auto",
		height: px[12],
		width: px[64],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	skeletonActor: {
		marginTop: px[8],
		marginLeft: "auto",
		height: px[16],
		width: px[112],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	queueListChild: {
		borderTopWidth: { default: null, ":not(:last-child)": 0 },
		borderBottomWidth: { default: null, ":not(:last-child)": "1px" },
		borderTopStyle: { default: null, ":not(:last-child)": "solid" },
		borderBottomStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: { default: null, ":not(:last-child)": palette.slate[200] },
	},
})

const route = getRouteApi("/image-queue/")

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

export const TYPE_OPTIONS = [
	"artist",
	"release",
] as const satisfies ImageQueueType[]
type TypeFilterKind = "all" | ImageQueueType
type TypeFilterOption = {
	value: TypeFilterKind
	label: string
}

export type StatusFilterKind = "pending" | "all"
export const STATUS_FILTER_OPTIONS: StatusFilterKind[] = ["pending", "all"]

const PAGE_SIZE = 20
const STATUS_TONES = {
	Pending: {
		color: "Marisa",
	},
	Approved: {
		color: "Green",
	},
	Rejected: {
		color: "Reimu",
	},
	Cancelled: {
		color: "Slate",
	},
	Reverted: {
		color: "Blue",
	},
} as const satisfies Record<
	ImageQueueStatus,
	{
		color: "Marisa" | "Green" | "Reimu" | "Slate" | "Blue"
	}
>

export type ManageFilters = {
	type?: ImageQueueType
	status: StatusFilterKind
}

type PendingImageQueueItem =
	CursorResponsePendingImageQueueItem["items"][number]

export type ImageQueueManagePageContentProps = {
	filters: ManageFilters
	pendingCount?: number
	items: PendingImageQueueItem[]
	isListLoading: boolean
	isListError: boolean
	isFetchingNextPage: boolean
	hasNextPage: boolean
	onTypeChange: (value: TypeFilterKind) => void
	onStatusChange: (value: StatusFilterKind) => void
	onLoadNextPage: () => void
}

export function ImageQueueManagePageContent(
	props: ImageQueueManagePageContentProps,
) {
	const { t } = useLingui()
	const scrollDirection = useScrollDirection()
	const typeFilterOptions = createMemo<TypeFilterOption[]>(() => [
		{
			value: "all",
			label: t`All`,
		},
		{
			value: "artist",
			label: StrExt.capitalize("artist"),
		},
		{
			value: "release",
			label: StrExt.capitalize("release"),
		},
	])
	const setSentinelRef = createInfiniteScroll({
		enabled: () => props.hasNextPage && !props.isFetchingNextPage,
		onLoadMore: () => props.onLoadNextPage(),
	})

	return (
		<PageLayout styles={styles.page}>
			<header {...stylex.attrs(styles.header)}>
				<div {...stylex.attrs(styles.eyebrow)}>{t`MODERATION`}</div>
				<h1 {...stylex.attrs(styles.title)}>{t`Image Queue`}</h1>
			</header>

			<section {...stylex.attrs(styles.panel)}>
				<StickyFilterBar
					scrollDirection={scrollDirection}
					styles={styles.filterBar}
				>
					<div {...stylex.attrs(styles.filters)}>
						<div {...stylex.attrs(styles.filter)}>
							<span {...stylex.attrs(styles.label)}>{t`Type`}</span>
							<Select.Root<TypeFilterOption>
								{...stylex.attrs(styles.typeSelect)}
								options={typeFilterOptions()}
								optionValue="value"
								optionTextValue="label"
								value={typeFilterOptions().find(
									(option) => option.value === (props.filters.type ?? "all"),
								)}
								onChange={(option) =>
									props.onTypeChange(option?.value ?? "all")
								}
								itemComponent={(itemProps) => (
									<Select.Item item={itemProps.item}>
										{itemProps.item.rawValue.label}
									</Select.Item>
								)}
							>
								<Select.Trigger styles={styles.selectTrigger}>
									<Select.Value<TypeFilterOption>>
										{(state) => state.selectedOption().label}
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

						<div {...stylex.attrs(styles.filter)}>
							<span {...stylex.attrs(styles.label)}>{t`Status`}</span>
							<Select.Root<StatusFilterKind>
								options={STATUS_FILTER_OPTIONS}
								value={props.filters.status}
								onChange={(value) =>
									props.onStatusChange(value ?? props.filters.status)
								}
								itemComponent={(itemProps) => (
									<Select.Item item={itemProps.item}>
										{StrExt.capitalize(itemProps.item.rawValue)}
									</Select.Item>
								)}
							>
								<Select.Trigger>
									<Select.Value<StatusFilterKind>>
										{(state) => StrExt.capitalize(state.selectedOption())}
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
				</StickyFilterBar>

				<Switch>
					<Match when={props.isListLoading}>
						<div {...stylex.attrs(styles.queueList)}>
							<For each={Array.from({ length: PAGE_SIZE })}>
								{() => <RowSkeleton />}
							</For>
						</div>
					</Match>

					<Match when={props.isListError}>
						<div {...stylex.attrs(styles.error)}>
							{t`Failed to load image queue.`}
						</div>
					</Match>

					<Match
						when={
							!props.isListLoading
							&& !props.isListError
							&& props.items.length > 0
						}
					>
						<div {...stylex.attrs(styles.queueList)}>
							<For each={props.items}>{(item) => <QueueRow item={item} />}</For>
						</div>
					</Match>

					<Match when={props.items.length === 0}>
						<div {...stylex.attrs(styles.emptyState)}>
							<div {...stylex.attrs(styles.emptyTitle)}>
								{t`No entries found`}
							</div>
							<div {...stylex.attrs(styles.emptyDescription)}>
								{t`No entries match the current filters.`}
							</div>
						</div>
					</Match>
				</Switch>

				<div
					ref={setSentinelRef}
					{...stylex.attrs(styles.progress)}
				></div>

				<Show when={props.isFetchingNextPage}>
					<div {...stylex.attrs(styles.queueList)}>
						<For each={Array.from({ length: Math.min(10, PAGE_SIZE) })}>
							{() => <RowSkeleton />}
						</For>
					</div>
				</Show>

				<Show when={!props.hasNextPage && props.items.length > 0}>
					<div {...stylex.attrs(styles.listEnd)}>{t`No more entries`}</div>
				</Show>
			</section>
		</PageLayout>
	)
}

export function ImageQueueManagePage() {
	const search = route.useSearch()
	const navigate = useNavigate({ from: "/image-queue/" })
	const filters = createMemo<ManageFilters>(() => ({
		type: search().type,
		status: search().status,
	}))

	const pendingCountQuery = useQuery(() => pendingImageQueueCountOptions())

	const listQuery = useInfiniteQuery(() => {
		const filter = filters()
		const request = {
			query: {
				limit: PAGE_SIZE,
				type: filter.type,
				status: filter.status === "pending" ? ("Pending" as const) : undefined,
			},
		}

		return {
			...pendingImageQueueInfiniteOptions(request),
			initialPageParam: request,
			getNextPageParam: ({ data: { next_cursor } }) => next_cursor,
		}
	})

	const items = createMemo(
		() => listQuery.data?.pages.flatMap((page) => page.data.items) ?? [],
	)

	return (
		<ImageQueueManagePageContent
			filters={filters()}
			pendingCount={pendingCountQuery.data?.data}
			items={items()}
			isListLoading={listQuery.isLoading}
			isListError={listQuery.isError}
			isFetchingNextPage={listQuery.isFetchingNextPage}
			hasNextPage={listQuery.hasNextPage}
			onTypeChange={(value) => {
				void navigate({
					to: "/image-queue",
					search: {
						...search(),
						type: value === "all" ? undefined : value,
					},
				})
			}}
			onStatusChange={(value) => {
				void navigate({
					to: "/image-queue",
					search: {
						...search(),
						status: value,
					},
				})
			}}
			onLoadNextPage={() => {
				void listQuery.fetchNextPage()
			}}
		/>
	)
}

function QueueRow(props: { item: PendingImageQueueItem }) {
	const { t } = useLingui()
	const tone = createMemo(() => STATUS_TONES[props.item.status])
	const ariaLabel = () => t`View image queue item #${props.item.id}`
	const createdAtLabel = createMemo(() => {
		const createdAt = new Date(props.item.created_at)
		return Number.isNaN(createdAt.getTime())
			? props.item.created_at
			: DATE_TIME.format(createdAt)
	})

	return (
		<div {...stylex.attrs(styles.queueRow, styles.queueListChild)}>
			<Link
				to="/image-queue/$id"
				params={{ id: props.item.id.toString() }}
				aria-label={ariaLabel()}
				class={stylex.attrs(link.base, link.text, styles.rowLink).class}
			/>

			<div {...stylex.attrs(styles.rowContent)}>
				<div {...stylex.attrs(styles.identity)}>
					<div {...stylex.attrs(styles.identityHeader)}>
						<span {...stylex.attrs(styles.queueId)}>#{props.item.id}</span>
						<Badge
							color={tone().color}
							styles={styles.status}
						>
							<ImageQueueStatusLabel status={props.item.status} />
						</Badge>
					</div>

					<Link
						to="/profile/$username/image-queue"
						params={{ username: props.item.created_by.name }}
						class={stylex.attrs(link.base, link.text, styles.entityLink).class}
					>
						{props.item.created_by.name}
					</Link>
				</div>

				<div {...stylex.attrs(styles.timestamps)}>
					<div>{t`Created at`}</div>
					<div>{createdAtLabel()}</div>
				</div>
			</div>
		</div>
	)
}

function ImageQueueStatusLabel(props: { status: ImageQueueStatus }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.status) {
			case "Pending": {
				return t`Pending`
			}
			case "Approved": {
				return t`Approved`
			}
			case "Rejected": {
				return t`Rejected`
			}
			case "Cancelled": {
				return t`Cancelled`
			}
			case "Reverted": {
				return t`Reverted`
			}
		}
	}

	return <>{label()}</>
}

function RowSkeleton() {
	return (
		<div
			{...stylex.attrs(
				animationStyles.pulse,
				styles.skeletonRow,
				styles.queueListChild,
			)}
		>
			<div>
				<div {...stylex.attrs(styles.skeletonTitle)}></div>
				<div {...stylex.attrs(styles.skeletonDescription)}></div>
			</div>
			<div {...stylex.attrs(styles.skeletonMetadata)}>
				<div {...stylex.attrs(styles.skeletonDate)}></div>
				<div {...stylex.attrs(styles.skeletonActor)}></div>
			</div>
		</div>
	)
}
