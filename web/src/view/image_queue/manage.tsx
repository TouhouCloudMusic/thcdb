import { useLingui } from "@lingui/solid/macro"
import { useInfiniteQuery, useQuery } from "@tanstack/solid-query"
import { getRouteApi, useNavigate } from "@tanstack/solid-router"
import type {
	ImageQueueStatus,
	ImageQueueType,
	PendingImageQueueItem,
} from "@thc/api"
import { ImageQueueQueryOption } from "@thc/query"
import { StrExt } from "@thc/toolkit/data"
import { createMemo, For, Match, Show, Switch } from "solid-js"

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

const QUEUE_LIST_CONTAINER_CLASS = "divide-y divide-slate-200 pt-2"
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
	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () => props.hasNextPage && !props.isFetchingNextPage,
		onIntersect: () => props.onLoadNextPage(),
	})

	return (
		<PageLayout class="flex flex-col p-8">
			<header class="flex flex-col gap-y-2">
				<div class="text-xs font-medium tracking-[0.2em] text-tertiary">
					{t`MODERATION`}
				</div>
				<h1 class="text-2xl font-light tracking-tight text-primary">
					{t`Image Queue`}
				</h1>
			</header>

			<section class="rounded-sm bg-white ">
				<StickyFilterBar
					scrollDirection={scrollDirection}
					class="border-slate-300"
				>
					<div class="flex gap-x-4">
						<div class="flex items-center gap-2">
							<span class="text-sm text-tertiary">{t`Type`}</span>
							<Select.Root<TypeFilterOption>
								class="min-w-24"
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
								<Select.Trigger class="w-full">
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

						<div class="flex items-center gap-2">
							<span class="text-sm text-tertiary">{t`Status`}</span>
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
						<div class={QUEUE_LIST_CONTAINER_CLASS}>
							<For each={Array.from({ length: PAGE_SIZE })}>
								{() => <RowSkeleton />}
							</For>
						</div>
					</Match>

					<Match when={props.isListError}>
						<div class="p-6 text-sm text-reimu-700">
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
						<div class={QUEUE_LIST_CONTAINER_CLASS}>
							<For each={props.items}>{(item) => <QueueRow item={item} />}</For>
						</div>
					</Match>

					<Match when={props.items.length === 0}>
						<div class="p-10">
							<div class="text-sm font-medium text-primary">
								{t`No entries found`}
							</div>
							<div class="mt-1 text-sm text-tertiary">
								{t`No entries match the current filters.`}
							</div>
						</div>
					</Match>
				</Switch>

				<div
					ref={setSentinelRef}
					class="h-1"
				></div>

				<Show when={props.isFetchingNextPage}>
					<div class={QUEUE_LIST_CONTAINER_CLASS}>
						<For each={Array.from({ length: Math.min(10, PAGE_SIZE) })}>
							{() => <RowSkeleton />}
						</For>
					</div>
				</Show>

				<Show when={!props.hasNextPage && props.items.length > 0}>
					<div class="border-t border-slate-200 px-4 py-8 text-center text-sm text-tertiary">
						{t`No more entries`}
					</div>
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

	const pendingCountQuery = useQuery(() => ImageQueueQueryOption.pendingCount())

	const listQuery = useInfiniteQuery(() =>
		ImageQueueQueryOption.list({
			limit: PAGE_SIZE,
			type: filters().type,
			status:
				filters().status === "pending"
					? // @wc-ignore
						"Pending"
					: undefined,
		}),
	)

	return (
		<ImageQueueManagePageContent
			filters={filters()}
			pendingCount={pendingCountQuery.data}
			items={listQuery.data?.pages.flatMap((page) => page.items) ?? []}
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
		<div class="relative rounded-sm isolate">
			<Link
				to="/image-queue/$id"
				params={{ id: props.item.id.toString() }}
				aria-label={ariaLabel()}
				class="absolute inset-0 rounded-sm no-underline"
			/>

			<div class="pointer-events-none grid grid-cols-2 grid-rows-2 gap-y-2 px-1 py-4 ">
				<div class="grid grid-cols-subgrid grid-rows-subgrid row-span-2">
					<div class="flex flex-wrap items-baseline gap-2">
						<span class="font-mono text-xs text-tertiary">
							#{props.item.id}
						</span>
						<Badge
							color={tone().color}
							class="px-2 py-0.5"
						>
							<ImageQueueStatusLabel status={props.item.status} />
						</Badge>
					</div>

					<Link
						to="/user/$id/image-queue"
						params={{ id: props.item.created_by.id.toString() }}
						class="pointer-events-auto relative z-10 truncate text-sm text-secondary size-fit"
					>
						{props.item.created_by.name}
					</Link>
				</div>

				<div class="grid grid-cols-subgrid grid-rows-subgrid justify-items-end text-sm text-slate-600 row-span-2">
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
		<div class="grid animate-pulse gap-3 px-4 py-4 md:grid-cols-[minmax(0,1fr)_11rem] md:items-center">
			<div>
				<div class="h-5 w-40 rounded bg-slate-200"></div>
				<div class="mt-2 h-4 w-56 rounded bg-slate-100"></div>
			</div>
			<div class="flex justify-between gap-3 md:block md:text-right">
				<div class="ml-auto h-3 w-16 rounded bg-slate-100"></div>
				<div class="mt-2 ml-auto h-4 w-28 rounded bg-slate-200"></div>
			</div>
		</div>
	)
}
