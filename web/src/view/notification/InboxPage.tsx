import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { Accessor } from "solid-js"
import { createMemo, For, Match, Show, Switch } from "solid-js"

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
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { createInfiniteScroll } from "~/utils/solid/createInfiniteScroll"
import { useNow } from "~/utils/solid/useNow"

import { NotificationCard } from "./NotificationCard"

const styles = stylex.create({
	notificationsChild: {
		borderBottomWidth: { default: null, ":not(:last-child)": "1px" },
		borderBottomStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: palette.slate[200],
	},
	body: {
		marginTop: px[16],
		display: "flex",
		flexDirection: "column",
		gap: px[8],
	},
	status: {
		paddingTop: px[32],
		paddingBottom: px[32],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[400],
	},
	error: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: px[8],
		paddingTop: px[32],
		paddingBottom: px[32],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[400],
	},
	pageStatus: {
		paddingTop: px[8],
		paddingBottom: px[8],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[400],
	},
	pageError: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		gap: px[8],
		paddingTop: px[8],
		paddingBottom: px[8],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[400],
	},
	sentinel: { height: px[4] },
	pageLayout: {
		paddingTop: px[16],
		paddingRight: px[16],
		paddingBottom: px[16],
		paddingLeft: px[16],
	},
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
	},
	toolbar: {
		marginTop: px[12],
		display: "flex",
		flexWrap: "wrap",
		alignItems: "flex-end",
		rowGap: px[4],
	},
	tabs: { gap: px[4] },
	tab: {
		paddingLeft: px[12],
		paddingRight: px[12],
		paddingTop: px[8],
		paddingBottom: px[8],
		fontWeight: 400,
		letterSpacing: 0,
		textTransform: "none",
		color: {
			default: palette.slate[500],
			":hover": { default: null, "@media (hover: hover)": colors.textPrimary },
			":is([data-selected])": palette.reimu[600],
		},
	},
	actions: {
		marginLeft: "auto",
		display: "flex",
		gap: px[8],
		paddingBottom: px[4],
	},
	markAllRead: {
		height: px[32],
		borderRadius: radius.sm,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		paddingLeft: px[12],
		paddingRight: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: { default: palette.slate[600], ":disabled": palette.slate[300] },
	},
	sort: { height: px[32] },
})

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
		<div {...stylex.attrs(styles.body)}>
			<Switch>
				<Match when={props.list().status === "loading"}>
					<div {...stylex.attrs(styles.status)}>
						<Trans>Loading…</Trans>
					</div>
				</Match>

				<Match when={props.list().status === "error"}>
					<div {...stylex.attrs(styles.error)}>
						<Trans>Failed to load notifications.</Trans>
						<Button
							onClick={props.retry}
							appearance="outline"
							tone="gray"
							size="sm"
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
									<div {...stylex.attrs(styles.status)}>
										<Trans>No notifications.</Trans>
									</div>
								}
							>
								<div>
									<For each={state().items}>
										{(item) => (
											<NotificationCard
												item={item}
												now={now()}
												setRead={props.setRead}
												setSaved={props.setSaved}
												isUpdatingRead={props.isUpdatingRead(item)}
												isUpdatingSaved={props.isUpdatingSaved(item)}
												styles={styles.notificationsChild}
											/>
										)}
									</For>
								</div>
							</Show>

							<Switch>
								<Match when={state().loadMoreStatus === "loading"}>
									<div {...stylex.attrs(styles.pageStatus)}>
										<Trans>Loading…</Trans>
									</div>
								</Match>

								<Match when={state().loadMoreStatus === "error"}>
									<div {...stylex.attrs(styles.pageError)}>
										<Trans>Failed to load more notifications.</Trans>
										<Button
											onClick={props.loadMore}
											appearance="outline"
											tone="gray"
											size="sm"
										>
											{t`Retry`}
										</Button>
									</div>
								</Match>

								<Match when={state().loadMoreStatus === "ready"}>
									<div
										ref={setLoadMoreTrigger}
										{...stylex.attrs(styles.sentinel)}
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
		<PageLayout styles={styles.pageLayout}>
			{/* TODO: Header Text component */}
			<h1 {...stylex.attrs(styles.title)}>
				<Trans>Notifications</Trans>
			</h1>

			<Tab.Root
				value={props.state()}
				onChange={selectState}
			>
				<div {...stylex.attrs(Tab.containerStyles, styles.toolbar)}>
					<Tab.List
						aria-label={t`Notifications`}
						styles={styles.tabs}
					>
						<For each={NOTIFICATION_STATES}>
							{(tab) => (
								<Tab.Trigger
									value={tab}
									styles={styles.tab}
								>
									{tabLabel(tab)}
								</Tab.Trigger>
							)}
						</For>
						<Tab.Indicator />
					</Tab.List>
					{/* Actions */}
					<div {...stylex.attrs(styles.actions)}>
						<button
							type="button"
							onClick={() => props.markAllRead()}
							disabled={!props.canMarkAllRead()}
							{...stylex.attrs(styles.markAllRead)}
						>
							<Trans>Mark all read</Trans>
						</button>

						<ToolbarSelect
							options={categoryOptions()}
							value={props.category() ?? "all"}
							placeholder={t`All categories`}
							ariaLabel={t`Filter by category`}
							styles={styles.sort}
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
