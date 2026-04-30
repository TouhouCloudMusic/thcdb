import { useLingui } from "@lingui/solid/macro"
import { useInfiniteQuery } from "@tanstack/solid-query"
import { useNavigate } from "@tanstack/solid-router"
import type { ImageQueueStatus, UserImageQueueItem } from "@thc/api"
import { ImageQueueQueryOption } from "@thc/query"
import { For, Match, Show, Switch } from "solid-js"

import { Badge } from "~/component/atomic/Badge"
import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { PageLayout } from "~/layout"
import { useIntersectionSentinel } from "~/utils/solid/useIntersectionSentinel"

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

const PAGE_SIZE = 20

const statusTone = (status: ImageQueueStatus) => {
	switch (status) {
		case "Pending": {
			return { color: "Marisa" } as const
		}
		case "Approved": {
			return { color: "Green" } as const
		}
		case "Rejected": {
			return { color: "Reimu" } as const
		}
		case "Cancelled": {
			return { color: "Slate" } as const
		}
		case "Reverted": {
			return { color: "Blue" } as const
		}
		default: {
			return { color: "Slate" } as const
		}
	}
}

const formatDateTime = (value: string | null | undefined) => {
	if (!value) return "—"
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return DATE_TIME.format(date)
}

type Props = {
	userId: number
}

export function UserImageQueuePage(props: Props) {
	const { t } = useLingui()
	const navigate = useNavigate()
	const listQuery = useInfiniteQuery(() =>
		ImageQueueQueryOption.userQueue(props.userId, PAGE_SIZE),
	)

	const items = () => listQuery.data?.pages.flatMap((p) => p.items) ?? []

	const setSentinelRef = useIntersectionSentinel<HTMLDivElement>({
		enabled: () => listQuery.hasNextPage && !listQuery.isFetchingNextPage,
		onIntersect: () => {
			void listQuery.fetchNextPage()
		},
	})

	return (
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<header class="flex flex-wrap items-center justify-between gap-4">
					<div class="min-w-0">
						<div class="text-xs font-medium tracking-[0.22em] text-slate-500">
							USER
						</div>
						<h1 class="mt-2 text-2xl font-light tracking-tight text-slate-900">
							Image Queue History
						</h1>
					</div>

					<div class="flex flex-wrap items-center gap-3">
						<Button
							variant="SecondaryV2"
							size="Sm"
							color="Slate"
							onClick={() => {
								void navigate({
									to: "/image-queue",
									search: { status: "pending" },
								})
							}}
						>
							Go to moderation
						</Button>
					</div>
				</header>

				<section class="overflow-hidden rounded-sm border border-slate-300 bg-white shadow-xs">
					<div class="grid grid-cols-[4rem_10rem_9rem_12rem_1fr] items-center border-b border-slate-200 bg-slate-50 px-4 py-3 text-[11px] font-medium tracking-[0.18em] text-slate-500">
						<div>{t`ID`}</div>
						<div>{t`IMAGE`}</div>
						<div>{t`STATUS`}</div>
						<div>{t`CREATED`}</div>
						<div>{t`HANDLED / REVERTED`}</div>
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
								{t`Failed to load user image queue.`}
							</div>
						</Match>

						<Match when={items().length === 0}>
							<div class="p-10">
								<div class="text-sm font-medium text-slate-900">
									{t`No entries yet`}
								</div>
								<div class="mt-1 text-sm text-slate-500">
									{t`This user has no image queue history.`}
								</div>
							</div>
						</Match>

						<Match when={true}>
							<div class="divide-y divide-slate-100">
								<For each={items()}>
									{(item) => <UserQueueRow item={item} />}
								</For>
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
							{t`No more entries`}
						</div>
					</Show>
				</section>
			</div>
		</PageLayout>
	)
}

function UserQueueRow(props: { item: UserImageQueueItem }) {
	const tone = () => statusTone(props.item.status)

	return (
		<div class="grid grid-cols-[4rem_10rem_9rem_12rem_1fr] items-center px-4 py-3 text-sm hover:bg-slate-50">
			<div class="font-mono text-xs text-slate-600">
				<Link
					to="/image-queue/$id"
					params={{ id: props.item.id.toString() }}
					class="text-slate-900 no-underline hover:underline"
				>
					{props.item.id}
				</Link>
			</div>

			<div class="text-sm text-slate-500">
				<Show
					when={props.item.image_id}
					fallback={<span class="text-slate-400">—</span>}
				>
					{props.item.image_id}
				</Show>
			</div>

			<div class="justify-self-start">
				<Badge
					color={tone().color}
					class="px-2 py-0.5"
				>
					<UserImageQueueStatusLabel status={props.item.status} />
				</Badge>
			</div>

			<div class="text-sm text-slate-500">
				{formatDateTime(props.item.created_at)}
			</div>

			<div class="flex flex-col gap-1 text-sm">
				<div class="text-slate-500">
					Handled:{" "}
					<span class="text-slate-700">
						{formatDateTime(props.item.handled_at)}
					</span>
					<Show when={props.item.handled_by}>
						<span class="ml-2 text-xs text-slate-400">
							{props.item.handled_by?.name}
						</span>
					</Show>
				</div>

				<div class="text-slate-500">
					Reverted:{" "}
					<span class="text-slate-700">
						{formatDateTime(props.item.reverted_at)}
					</span>
					<Show when={props.item.reverted_by}>
						<span class="ml-2 text-xs text-slate-400">
							{props.item.reverted_by?.name}
						</span>
					</Show>
				</div>
			</div>
		</div>
	)
}

function UserImageQueueStatusLabel(props: { status: ImageQueueStatus }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.status) {
			case "Pending": {
				return t`PENDING`
			}
			case "Approved": {
				return t`APPROVED`
			}
			case "Rejected": {
				return t`REJECTED`
			}
			case "Cancelled": {
				return t`CANCELLED`
			}
			case "Reverted": {
				return t`REVERTED`
			}
			default: {
				return t`UNKNOWN`
			}
		}
	}

	return <>{label()}</>
}

function RowSkeleton() {
	return (
		<div class="grid animate-pulse grid-cols-[4rem_10rem_9rem_12rem_1fr] items-center px-4 py-3">
			<div class="h-4 w-20 rounded bg-slate-200"></div>
			<div class="h-4 w-24 rounded bg-slate-100"></div>
			<div class="h-5 w-24 rounded-full bg-slate-200"></div>
			<div class="h-4 w-32 rounded bg-slate-100"></div>
			<div class="h-4 w-64 rounded bg-slate-200"></div>
		</div>
	)
}
