import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"
import type { Component } from "solid-js"

import { Pagination } from "~/component/Pagination"
import { inputStyles } from "~/component/atomic/Input"
import { Intersperse } from "~/component/data/Intersperse"
import {
	EmptyExplorePlaceholder,
	ExploreFilterBar,
	ExploreFilterField,
	ExplorePageLayout,
	OrderBySelect,
} from "~/component/feature/entity_explore"
import type { EventListItem } from "~/hey-api"
import { exploreEventOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import { radius, px } from "~/style/tokens.stylex"
import { EventItem } from "~/view/event/EventItem"

import { animationStyles } from "../../style/animations.stylex"

const styles = stylex.create({
	skeletonTitle: {
		marginBottom: px[8],
		height: px[20],
		width: "calc(2/3 * 100%)",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonDetails: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		columnGap: px[8],
		rowGap: px[4],
	},
	skeletonDate: {
		height: px[16],
		width: px[112],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	skeletonLocation: {
		height: px[16],
		width: px[160],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	skeletonDescription: {
		marginTop: px[8],
		height: px[16],
		width: "calc(3/5 * 100%)",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	dateInput: { height: px[40], width: "100%" },
	list: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
	pagination: {
		display: "flex",
		justifyContent: "center",
		paddingBlock: px[24],
	},
})

const route = getRouteApi("/event/explore")

const EventItemSkeleton: Component = () => (
	<div {...stylex.attrs(animationStyles.pulse)}>
		<div {...stylex.attrs(styles.skeletonTitle)}></div>
		<div {...stylex.attrs(styles.skeletonDetails)}>
			<div {...stylex.attrs(styles.skeletonDate)}></div>
			<div {...stylex.attrs(styles.skeletonLocation)}></div>
		</div>
		<div {...stylex.attrs(styles.skeletonDescription)}></div>
	</div>
)

type EventExploreFilterBarProps = {
	startDateFrom: string | undefined
	startDateTo: string | undefined
	orderBy: "asc" | "desc" | undefined
	onChangeStartDate: (
		key: "start_date_from" | "start_date_to",
		value: string,
	) => void
	onChangeOrderBy: (value: "asc" | "desc") => void
}

function EventExploreFilterBar(props: EventExploreFilterBarProps) {
	const { t } = useLingui()
	return (
		<ExploreFilterBar>
			<ExploreFilterField label={t`From`}>
				<input
					type="date"
					value={props.startDateFrom ?? ""}
					onChange={(e) =>
						props.onChangeStartDate("start_date_from", e.currentTarget.value)
					}
					{...stylex.attrs(
						inputStyles.like,
						inputStyles.input,
						styles.dateInput,
					)}
				/>
			</ExploreFilterField>

			<ExploreFilterField label={t`To`}>
				<input
					type="date"
					value={props.startDateTo ?? ""}
					onChange={(e) =>
						props.onChangeStartDate("start_date_to", e.currentTarget.value)
					}
					{...stylex.attrs(
						inputStyles.like,
						inputStyles.input,
						styles.dateInput,
					)}
				/>
			</ExploreFilterField>

			<OrderBySelect
				value={props.orderBy}
				onChange={props.onChangeOrderBy}
			/>
		</ExploreFilterBar>
	)
}

type EventExploreListProps = {
	events: EventListItem[]
	isLoading: boolean
	isFetching: boolean
	limit: number
	page: number
	totalPages: number
	onPageChange: (page: number) => void
}

function EventExploreList(props: EventExploreListProps) {
	const { t } = useLingui()
	return (
		<>
			<Show when={!props.isLoading && props.events.length === 0}>
				<EmptyExplorePlaceholder
					title={t`No events found`}
					action={{ to: "/event/new" }}
				/>
			</Show>

			<Show
				when={props.events.length > 0 || props.isFetching || props.isLoading}
			>
				<div {...stylex.attrs(styles.list)}>
					<Intersperse
						of={props.events}
						with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
					>
						{(event) => <EventItem event={event} />}
					</Intersperse>
					<Show when={props.isFetching || props.isLoading}>
						<Show when={props.events.length > 0}>
							<span {...stylex.attrs(dividerStyles.horizontal)}></span>
						</Show>
						<Intersperse
							of={Array.from({ length: props.limit })}
							with={<span {...stylex.attrs(dividerStyles.horizontal)}></span>}
						>
							{() => <EventItemSkeleton />}
						</Intersperse>
					</Show>
				</div>
			</Show>

			<Show when={props.totalPages > 1}>
				<div {...stylex.attrs(styles.pagination)}>
					<Pagination
						current={props.page}
						total={props.totalPages}
						onPageChange={props.onPageChange}
					/>
				</div>
			</Show>
		</>
	)
}

export const EventExplore = () => {
	const { t } = useLingui()
	const search = route.useSearch()

	const navigate = useNavigate({ from: "/event/explore" })

	const eventsQuery = useQuery(() => {
		const snapshot = search()
		return exploreEventOptions({
			query: {
				limit: snapshot.limit,
				page: snapshot.page,
				start_date_from: snapshot.start_date_from,
				start_date_to: snapshot.start_date_to,
				sort_direction: snapshot.order_by,
			},
		})
	})

	const events = () => eventsQuery.data?.data.items ?? []
	const totalPages = () => eventsQuery.data?.data.total_pages ?? 0

	const setPage = (page: number) => {
		void navigate({
			to: "/event/explore",
			search: { ...search(), page },
		})
	}

	const updateOrderBy = (value: "asc" | "desc" | undefined) => {
		void navigate({
			to: "/event/explore",
			search: {
				...search(),
				order_by: value,
				page: 1,
			},
		})
	}

	const setOrderBy = (value: "asc" | "desc") => {
		updateOrderBy(value)
	}

	const updateStartDate = (
		key: "start_date_from" | "start_date_to",
		value: string,
	) => {
		const nextValue = value.length > 0 ? value : undefined

		void navigate({
			to: "/event/explore",
			search: {
				...search(),
				[key]: nextValue,
				page: 1,
			},
		})
	}

	return (
		<ExplorePageLayout
			title={t`Explore Events`}
			action={{ to: "/event/new", label: t`Create event` }}
		>
			<EventExploreFilterBar
				startDateFrom={search().start_date_from}
				startDateTo={search().start_date_to}
				orderBy={search().order_by}
				onChangeStartDate={updateStartDate}
				onChangeOrderBy={setOrderBy}
			/>

			<EventExploreList
				events={events()}
				isLoading={eventsQuery.isLoading}
				isFetching={eventsQuery.isFetching}
				limit={search().limit}
				page={search().page}
				totalPages={totalPages()}
				onPageChange={setPage}
			/>
		</ExplorePageLayout>
	)
}
