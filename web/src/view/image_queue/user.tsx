import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link, useNavigate } from "@tanstack/solid-router"
import { For, Match, Show, Switch } from "solid-js"

import { Badge } from "~/component/atomic/Badge"
import { Button } from "~/component/atomic/button"
import type {
	CursorResponseUserImageQueueItem,
	ImageQueueStatus,
} from "~/hey-api"
import { PageLayout } from "~/layout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	fonts,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { createInfiniteScroll } from "~/utils/solid/createInfiniteScroll"

import { animationStyles } from "../../style/animations.stylex"

const styles = stylex.create({
	queueRow: {
		display: "grid",
		gridTemplateColumns: "4rem 10rem 9rem 12rem 1fr",
		alignItems: "center",
		paddingInline: px[16],
		paddingBlock: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	skeletonRow: {
		display: "grid",
		gridTemplateColumns: "4rem 10rem 9rem 12rem 1fr",
		alignItems: "center",
		paddingInline: px[16],
		paddingBlock: px[12],
	},
	queueListChild: {
		borderTopWidth: { default: null, ":not(:last-child)": 0 },
		borderBottomWidth: { default: null, ":not(:last-child)": "1px" },
		borderTopStyle: { default: null, ":not(:last-child)": "solid" },
		borderBottomStyle: { default: null, ":not(:last-child)": "solid" },
		borderColor: { default: null, ":not(:last-child)": palette.slate[100] },
	},
	page: { padding: px[32] },
	content: { display: "flex", flexDirection: "column", gap: px[24] },
	header: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[16],
	},
	heading: { minWidth: "0rem" },
	eyebrow: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: "0.22em",
		color: palette.slate[500],
	},
	title: {
		marginTop: px[8],
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: palette.slate[900],
	},
	actions: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[12],
	},
	panel: {
		overflow: "hidden",
		borderRadius: radius.sm,
		borderStyle: "solid",
		borderWidth: "1px",
		borderColor: palette.slate[300],
		backgroundColor: palette.white,
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	tableHeader: {
		display: "grid",
		gridTemplateColumns: "4rem 10rem 9rem 12rem 1fr",
		alignItems: "center",
		borderBottomStyle: "solid",
		borderBottomWidth: "1px",
		borderColor: palette.slate[200],
		paddingInline: px[16],
		paddingBlock: px[12],
		fontSize: "11px",
		fontWeight: 500,
		letterSpacing: "0.18em",
		color: palette.slate[500],
	},
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
		color: palette.slate[900],
	},
	emptyDescription: {
		marginTop: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	progress: { height: px[4] },
	appendedList: {
		borderTopStyle: "solid",
		borderTopWidth: "1px",
		borderColor: palette.slate[100],
	},
	listEnd: {
		borderTopStyle: "solid",
		borderTopWidth: "1px",
		borderColor: palette.slate[100],
		paddingInline: px[16],
		paddingBlock: px[16],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[400],
	},
	queueId: {
		fontFamily: fonts.mono,
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[600],
	},
	queueLink: {
		color: palette.slate[900],
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	muted: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	missing: { color: palette.slate[400] },
	statusCell: { justifySelf: "flex-start" },
	status: { paddingInline: px[8], paddingBlock: px[2] },
	targetDetails: {
		display: "flex",
		flexDirection: "column",
		gap: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	targetLabel: { color: palette.slate[500] },
	targetName: { color: palette.slate[700] },
	targetId: {
		marginLeft: px[8],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[400],
	},
	skeletonId: {
		height: px[16],
		width: px[80],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
	skeletonType: {
		height: px[16],
		width: px[96],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	skeletonStatus: {
		height: px[20],
		width: px[96],
		borderRadius: radius.full,
		backgroundColor: palette.slate[200],
	},
	skeletonDate: {
		height: px[16],
		width: px[128],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
	},
	skeletonTarget: {
		height: px[16],
		width: px[256],
		borderRadius: radius.sm,
		backgroundColor: palette.slate[200],
	},
})

const DATE_TIME = new Intl.DateTimeFormat(undefined, {
	dateStyle: "medium",
	timeStyle: "short",
})

export const USER_IMAGE_QUEUE_PAGE_SIZE = 20

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
	items: UserImageQueueItem[]
	isLoading: boolean
	isError: boolean
	hasNextPage: boolean
	isFetchingNextPage: boolean
	onLoadMore: () => void
}

export function UserImageQueuePage(props: Props) {
	const { t } = useLingui()
	const navigate = useNavigate()

	const setSentinelRef = createInfiniteScroll({
		enabled: () => props.hasNextPage && !props.isFetchingNextPage,
		onLoadMore: () => props.onLoadMore(),
	})

	return (
		<PageLayout styles={styles.page}>
			<div {...stylex.attrs(styles.content)}>
				<header {...stylex.attrs(styles.header)}>
					<div {...stylex.attrs(styles.heading)}>
						<div {...stylex.attrs(styles.eyebrow)}>USER</div>
						<h1 {...stylex.attrs(styles.title)}>Image Queue History</h1>
					</div>

					<div {...stylex.attrs(styles.actions)}>
						<Button
							onClick={() => {
								void navigate({
									to: "/image-queue",
									search: { status: "pending" },
								})
							}}
							appearance="outline"
							tone="slate"
							size="sm"
						>
							Go to moderation
						</Button>
					</div>
				</header>

				<section {...stylex.attrs(styles.panel)}>
					<div {...stylex.attrs(styles.tableHeader)}>
						<div>{t`ID`}</div>
						<div>{t`IMAGE`}</div>
						<div>{t`STATUS`}</div>
						<div>{t`CREATED`}</div>
						<div>{t`HANDLED / REVERTED`}</div>
					</div>

					<Switch>
						<Match when={props.isLoading}>
							<div>
								<For each={Array.from({ length: USER_IMAGE_QUEUE_PAGE_SIZE })}>
									{() => <RowSkeleton />}
								</For>
							</div>
						</Match>

						<Match when={props.isError}>
							<div {...stylex.attrs(styles.error)}>
								{t`Failed to load user image queue.`}
							</div>
						</Match>

						<Match when={props.items.length === 0}>
							<div {...stylex.attrs(styles.emptyState)}>
								<div {...stylex.attrs(styles.emptyTitle)}>
									{t`No entries yet`}
								</div>
								<div {...stylex.attrs(styles.emptyDescription)}>
									{t`This user has no image queue history.`}
								</div>
							</div>
						</Match>

						<Match when={true}>
							<div>
								<For each={props.items}>
									{(item) => <UserQueueRow item={item} />}
								</For>
							</div>
						</Match>
					</Switch>

					<div
						ref={setSentinelRef}
						{...stylex.attrs(styles.progress)}
					></div>

					<Show when={props.isFetchingNextPage}>
						<div {...stylex.attrs(styles.appendedList)}>
							<For
								each={Array.from({
									length: Math.min(10, USER_IMAGE_QUEUE_PAGE_SIZE),
								})}
							>
								{() => <RowSkeleton />}
							</For>
						</div>
					</Show>

					<Show when={!props.hasNextPage && props.items.length > 0}>
						<div {...stylex.attrs(styles.listEnd)}>{t`No more entries`}</div>
					</Show>
				</section>
			</div>
		</PageLayout>
	)
}

type UserImageQueueItem = CursorResponseUserImageQueueItem["items"][number]

function UserQueueRow(props: { item: UserImageQueueItem }) {
	const tone = () => statusTone(props.item.status)

	return (
		<div {...stylex.attrs(styles.queueRow, styles.queueListChild)}>
			<div {...stylex.attrs(styles.queueId)}>
				<Link
					to="/image-queue/$id"
					params={{ id: props.item.id.toString() }}
					class={stylex.attrs(link.base, link.text, styles.queueLink).class}
				>
					{props.item.id}
				</Link>
			</div>

			<div {...stylex.attrs(styles.muted)}>
				<Show
					when={props.item.image_id}
					fallback={<span {...stylex.attrs(styles.missing)}>—</span>}
				>
					{props.item.image_id}
				</Show>
			</div>

			<div {...stylex.attrs(styles.statusCell)}>
				<Badge
					color={tone().color}
					styles={styles.status}
				>
					<UserImageQueueStatusLabel status={props.item.status} />
				</Badge>
			</div>

			<div {...stylex.attrs(styles.muted)}>
				{formatDateTime(props.item.created_at)}
			</div>

			<div {...stylex.attrs(styles.targetDetails)}>
				<div {...stylex.attrs(styles.targetLabel)}>
					Handled:{" "}
					<span {...stylex.attrs(styles.targetName)}>
						{formatDateTime(props.item.handled_at)}
					</span>
					<Show when={props.item.handled_by}>
						<span {...stylex.attrs(styles.targetId)}>
							{props.item.handled_by?.name}
						</span>
					</Show>
				</div>

				<div {...stylex.attrs(styles.targetLabel)}>
					Reverted:{" "}
					<span {...stylex.attrs(styles.targetName)}>
						{formatDateTime(props.item.reverted_at)}
					</span>
					<Show when={props.item.reverted_by}>
						<span {...stylex.attrs(styles.targetId)}>
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
		<div
			{...stylex.attrs(
				animationStyles.pulse,
				styles.skeletonRow,
				styles.queueListChild,
			)}
		>
			<div {...stylex.attrs(styles.skeletonId)}></div>
			<div {...stylex.attrs(styles.skeletonType)}></div>
			<div {...stylex.attrs(styles.skeletonStatus)}></div>
			<div {...stylex.attrs(styles.skeletonDate)}></div>
			<div {...stylex.attrs(styles.skeletonTarget)}></div>
		</div>
	)
}
