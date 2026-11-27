import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { createUniqueId, Show } from "solid-js"

import { buttonSizeStyles, buttonStyles } from "~/component/atomic/button"
import type { CursorResponseUserImageQueueItem } from "~/hey-api"
import { PageLayout } from "~/layout"
import { palette } from "~/style/color/palette.stylex"
import { px } from "~/style/tokens.stylex"
import type { InfiniteQueryState } from "~/utils/adapter/tanstack/infiniteQueryState"

import { ImageQueueList } from "./list"
import { listPageStyles } from "./listPage.stylex"
import { ImageQueueDate, ImageQueueRow, rowMetadataStyles } from "./listRow"

const rowStyles = stylex.create({
	list: {
		borderTopWidth: 1,
		borderTopStyle: "solid",
		borderTopColor: palette.slate[200],
		gridTemplateColumns: {
			default: "3rem minmax(0, 1fr) max-content",
			"@container (min-width: 40rem)":
				"3rem max-content minmax(0, 1fr) fit-content(12rem) max-content",
		},
	},
	submittedAt: {
		gridColumn: "2",
		gridRow: "2",
		justifySelf: { default: "end", "@container (min-width: 40rem)": "start" },
	},
	reviewer: {
		gridColumn: { default: "1", "@container (min-width: 40rem)": "-3 / -2" },
	},
	eventRow: {
		gridRow: { default: "3", "@container (min-width: 40rem)": "2" },
	},
})

type UserImageQueueItem = CursorResponseUserImageQueueItem["items"][number]

function HistoryQueueRow(props: { item: UserImageQueueItem }) {
	const { t } = useLingui()
	const reverted = () => props.item.status === "Reverted"
	const reviewerLabel = () => {
		const reviewer = reverted()
			? props.item.reverted_by?.name
			: props.item.handled_by?.name
		if (!reviewer) return
		return reverted() ? t`Reverted by ${reviewer}` : t`Handled by ${reviewer}`
	}

	return (
		<ImageQueueRow item={props.item}>
			<ImageQueueDate
				value={props.item.created_at}
				styles={rowStyles.submittedAt}
			/>
			<Show when={reviewerLabel()}>
				{(label) => (
					<span
						title={label()}
						{...stylex.attrs(
							rowMetadataStyles.actor,
							rowMetadataStyles.truncated,
							rowStyles.reviewer,
							rowStyles.eventRow,
						)}
					>
						{label()}
					</span>
				)}
			</Show>
			<Show when={reverted() ? props.item.reverted_at : props.item.handled_at}>
				{(date) => (
					<ImageQueueDate
						value={date()}
						styles={[rowMetadataStyles.eventDate, rowStyles.eventRow]}
					/>
				)}
			</Show>
		</ImageQueueRow>
	)
}

const pageStyles = stylex.create({
	header: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
		overflowWrap: "anywhere",
	},
})

type Props = {
	username?: string
	list: InfiniteQueryState<UserImageQueueItem>
}

export function UserImageQueuePage(props: Props) {
	const { t } = useLingui()
	const headingId = createUniqueId()
	const title = () => {
		const username = props.username
		return username
			? t`${username}’s Image Queue History`
			: t`Image Queue History`
	}

	return (
		<PageLayout styles={listPageStyles.layout}>
			<header {...stylex.attrs(pageStyles.header)}>
				<h1
					id={headingId}
					{...stylex.attrs(listPageStyles.title)}
				>
					{title()}
				</h1>
				<Link
					to="/image-queue"
					search={{ status: "pending" }}
					class={
						stylex.attrs(
							buttonStyles.base,
							buttonStyles.outline,
							buttonStyles.slate,
							buttonSizeStyles.sm,
						).class
					}
				>{t`Image Queue`}</Link>
			</header>

			<section aria-labelledby={headingId}>
				<ImageQueueList
					as="ol"
					styles={rowStyles.list}
					state={props.list}
					emptyMessage={t`This user has no image queue history.`}
					errorMessage={t`Failed to load user image queue.`}
				>
					{(item) => <HistoryQueueRow item={item} />}
				</ImageQueueList>
			</section>
		</PageLayout>
	)
}
