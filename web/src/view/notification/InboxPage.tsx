import { Trans, useLingui } from "@lingui/solid/macro"
import type { Accessor } from "solid-js"
import { createMemo, For, Match, Show, Switch } from "solid-js"
import { twJoin } from "tailwind-merge"

import { Tab } from "~/component/atomic/Tab"
import { Button } from "~/component/atomic/button"
import type { ToolbarSelectOption } from "~/component/atomic/form/ToolbarSelect"
import { ToolbarSelect } from "~/component/atomic/form/ToolbarSelect"
import type {
	NotificationCategory,
	NotificationItem,
	NotificationState,
} from "~/hey-api"
import { PageLayout } from "~/layout/PageLayout"
import { createInfiniteScroll } from "~/utils/solid/createInfiniteScroll"
import { useNow } from "~/utils/solid/useNow"

import { NotificationCard } from "./NotificationCard"

const NOTIFICATION_STATES: readonly NotificationState[] = [
	"inbox",
	"unread",
	"saved",
]

// Have to export it because typescript's type inference
export type NotificationListLoadMoreStatus =
	| "unavailable"
	| "ready"
	| "loading"
	| "error"

// Projection of query state
export type NotificationList =
	| { status: "loading" }
	| { status: "error" }
	| {
			status: "loaded"
			items: readonly NotificationItem[]
			loadMoreStatus: NotificationListLoadMoreStatus
	  }

type NotificationInboxListProps = {
	list: Accessor<NotificationList>
	loadMore: () => void
	retry: () => void

	isUpdatingRead: (item: NotificationItem) => boolean
	setRead: (item: NotificationItem, read: boolean) => void
	isUpdatingSaved: (item: NotificationItem) => boolean
	setSaved: (item: NotificationItem, saved: boolean) => void
}

function NotificationInboxList(props: NotificationInboxListProps) {
	const { t } = useLingui()
	const now = useNow()

	const loadedList = () => {
		const list = props.list()
		return list.status === "loaded" ? list : undefined
	}

	const setLoadMoreTrigger = createInfiniteScroll({
		enabled: () => loadedList()?.loadMoreStatus === "ready",
		onLoadMore: () => props.loadMore(),
	})

	return (
		<div class="mt-4 flex flex-col gap-2">
			<Switch>
				<Match when={props.list().status === "loading"}>
					<div class="py-8 text-center text-sm text-slate-400">
						<Trans>Loading…</Trans>
					</div>
				</Match>

				<Match when={props.list().status === "error"}>
					<div class="flex flex-col items-center gap-2 py-8 text-center text-sm text-slate-400">
						<Trans>Failed to load notifications.</Trans>
						<Button
							variant="SecondaryV2"
							size="Sm"
							onClick={props.retry}
						>
							{t`Retry`}
						</Button>
					</div>
				</Match>

				<Match when={loadedList()}>
					{(state) => (
						<>
							<Show
								when={state().items.length}
								fallback={
									<div class="py-8 text-center text-sm text-slate-400">
										<Trans>No notifications.</Trans>
									</div>
								}
							>
								<div class="divide-y divide-slate-200">
									<For each={state().items}>
										{(item) => (
											<NotificationCard
												item={item}
												now={now()}
												setRead={props.setRead}
												setSaved={props.setSaved}
												isUpdatingRead={props.isUpdatingRead(item)}
												isUpdatingSaved={props.isUpdatingSaved(item)}
											/>
										)}
									</For>
								</div>
							</Show>

							<Switch>
								<Match when={state().loadMoreStatus === "loading"}>
									<div class="py-2 text-center text-sm text-slate-400">
										<Trans>Loading…</Trans>
									</div>
								</Match>

								<Match when={state().loadMoreStatus === "error"}>
									<div class="flex flex-col items-center gap-2 py-2 text-center text-sm text-slate-400">
										<Trans>Failed to load more notifications.</Trans>
										<Button
											variant="SecondaryV2"
											size="Sm"
											onClick={props.loadMore}
										>
											{t`Retry`}
										</Button>
									</div>
								</Match>

								<Match when={state().loadMoreStatus === "ready"}>
									<div
										ref={setLoadMoreTrigger}
										class="h-1"
									></div>
								</Match>
							</Switch>
						</>
					)}
				</Match>
			</Switch>
		</div>
	)
}

type NotificationInboxPageProps = NotificationInboxListProps & {
	state: Accessor<NotificationState>
	setState: (state: NotificationState) => void
	category: Accessor<NotificationCategory | undefined>
	setCategory: (category: NotificationCategory | undefined) => void
	canMarkAllRead: Accessor<boolean>
	markAllRead: () => void
}

export function NotificationInboxPage(props: NotificationInboxPageProps) {
	const { t } = useLingui()

	const tabLabel = (tab: NotificationState) => {
		switch (tab) {
			case "inbox": {
				return t`Inbox`
			}
			case "unread": {
				return t`Unread`
			}
			case "saved": {
				return t`Saved`
			}
		}
	}

	const selectState = (state: string) => {
		switch (state) {
			case "inbox":
			case "unread":
			case "saved": {
				props.setState(state)
			}
		}
	}

	const categoryOptions = createMemo<
		ToolbarSelectOption<NotificationCategory | "all">[]
	>(() => [
		{
			value: "all",
			label: t`All categories`,
			itemLabel: t`All categories`,
		},
		{
			value: "Correction",
			label: t`Correction`,
			itemLabel: t`Correction`,
		},
		{
			value: "Comment",
			label: t`Comment`,
			itemLabel: t`Comment`,
		},
		{
			value: "Social",
			label: t`Social`,
			itemLabel: t`Social`,
		},
		{
			value: "Collection",
			label: t`Collection`,
			itemLabel: t`Collection`,
		},
		{
			value: "ImageQueue",
			label: t`Image queue`,
			itemLabel: t`Image queue`,
		},
		{
			value: "Account",
			label: t`Account`,
			itemLabel: t`Account`,
		},
	])

	return (
		<PageLayout class="p-4">
			{/* TODO: Header Text component */}
			<h1 class="text-2xl font-light tracking-tight">
				<Trans>Notifications</Trans>
			</h1>

			<Tab.Root
				value={props.state()}
				onChange={selectState}
			>
				<div
					class={twJoin(
						Tab.CONTAINER_CLASS,
						"mt-3 flex flex-wrap items-end gap-y-1",
					)}
				>
					<Tab.List
						aria-label={t`Notifications`}
						class="gap-1"
					>
						<For each={NOTIFICATION_STATES}>
							{(tab) => (
								<Tab.Trigger
									value={tab}
									class="px-3 py-2 font-normal tracking-normal normal-case text-slate-500 data-selected:text-reimu-600"
								>
									{tabLabel(tab)}
								</Tab.Trigger>
							)}
						</For>
						<Tab.Indicator />
					</Tab.List>
					{/* Actions */}
					<div class="ml-auto flex gap-2 pb-1">
						<button
							type="button"
							onClick={() => props.markAllRead()}
							disabled={!props.canMarkAllRead()}
							class="h-8 rounded-sm border border-slate-300 px-3 text-sm text-slate-600 disabled:text-slate-300"
						>
							<Trans>Mark all read</Trans>
						</button>

						<ToolbarSelect
							options={categoryOptions()}
							value={props.category() ?? "all"}
							placeholder={t`All categories`}
							ariaLabel={t`Filter by category`}
							class="h-8"
							onChange={(category) =>
								props.setCategory(category === "all" ? undefined : category)
							}
						/>
					</div>
				</div>

				<For each={NOTIFICATION_STATES}>
					{(state) => (
						<Tab.Content value={state}>
							<NotificationInboxList
								list={props.list}
								loadMore={props.loadMore}
								retry={props.retry}
								isUpdatingRead={props.isUpdatingRead}
								setRead={props.setRead}
								isUpdatingSaved={props.isUpdatingSaved}
								setSaved={props.setSaved}
							/>
						</Tab.Content>
					)}
				</For>
			</Tab.Root>
		</PageLayout>
	)
}
