import { Plural, Trans, useLingui } from "@lingui/solid/macro"
import type { StyleXStyles } from "@stylexjs/stylex"
import * as stylex from "@stylexjs/stylex"
import type { LinkComponentProps } from "@tanstack/solid-router"
import { Link } from "@tanstack/solid-router"
import {
	BookmarkFilledIcon,
	BookmarkIcon,
	EnvelopeClosedIcon,
	EnvelopeOpenIcon,
} from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { Match, Show, Switch } from "solid-js"

import { Button } from "~/component/atomic/button"
import { Intersperse } from "~/component/data/Intersperse"
import type {
	CollectionReference,
	EntityMeta,
	NotificationItem,
	UserSummary,
} from "~/hey-api"
import { useI18N } from "~/state/i18n"
import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { formatRelativeTime } from "~/utils/dateTime"

const styles = stylex.create({
	link: {
		fontWeight: 500,
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
	},
	unavailableCollection: { color: palette.slate[500] },
	comment: { marginTop: px[4], color: colors.textTertiary },
	notification: {
		display: "flex",
		gap: px[16],
		backgroundColor: {
			default: colors.backgroundPrimary,
			":hover": {
				default: null,
				"@media (hover: hover)": colors.backgroundSecondary,
			},
		},
		paddingTop: px[16],
		paddingRight: px[16],
		paddingBottom: px[16],
		paddingLeft: px[16],
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		transitionDuration: "150ms",
	},
	body: {
		minWidth: 0,
		flex: "1",
		overflowWrap: "break-word",
		textAlign: "left",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	unread: { color: colors.textPrimary },
	read: { color: colors.textSecondary },
	timestamp: {
		marginTop: px[6],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: colors.textTertiary,
	},
	actions: {
		display: "flex",
		width: px[64],
		flexShrink: 0,
		alignSelf: "center",
		gap: px[2],
	},
	action: {
		width: px[32],
		height: px[32],
		backgroundColor: {
			default: "transparent",
			":active": palette.slate[200],
			":disabled": {
				default: colors.backgroundSecondary,
				":hover": {
					default: null,
					"@media (hover: hover)": colors.backgroundSecondary,
				},
				":active": colors.backgroundSecondary,
			},
			":hover": { default: null, "@media (hover: hover)": palette.slate[200] },
		},
	},
})

const ENTITY_ROUTE_BY_KIND = {
	Artist: "/artist/$id",
	Release: "/release/$id",
	Song: "/song/$id",
	Label: "/label/$id",
	Event: "/event/$id",
	Tag: "/tag/$id",
	Correction: "/correction/$id",
	ImageQueue: "/image-queue/$id",
} as const satisfies Record<
	EntityMeta["kind"],
	NonNullable<LinkComponentProps["to"]>
>

type NotificationBodyOfKind<Kind extends NotificationItem["body"]["kind"]> =
	Extract<NotificationItem["body"], { kind: Kind }>

function UserLink(props: { user: UserSummary; onOpen?: () => void }) {
	return (
		<Link
			to="/profile/$username"
			params={{ username: props.user.name }}
			onClick={props.onOpen}
			{...stylex.attrs(styles.link)}
		>
			{props.user.name}
		</Link>
	)
}

function EntityLink(props: { entity: EntityMeta; onOpen?: () => void }) {
	return (
		<Link
			to={ENTITY_ROUTE_BY_KIND[props.entity.kind]}
			params={{ id: props.entity.id.toString() }}
			onClick={props.onOpen}
			{...stylex.attrs(styles.link)}
		>
			{props.entity.name}
		</Link>
	)
}

function CollectionLink(props: {
	collection: CollectionReference
	onOpen?: () => void
}) {
	const { t } = useLingui()

	return (
		<Switch>
			<Match when={props.collection.state === "Deleted"}>
				<span
					{...stylex.attrs(styles.unavailableCollection)}
				>{`[${t`deleted collection`}]`}</span>
			</Match>
			<Match when={props.collection.state === "Restricted"}>
				<span
					{...stylex.attrs(styles.unavailableCollection)}
				>{`[${t`restricted collection`}]`}</span>
			</Match>
			<Match when={props.collection.state === "Available" && props.collection}>
				{(collection) => (
					<Link
						to="/collection/$id"
						params={{ id: collection().id.toString() }}
						onClick={props.onOpen}
						{...stylex.attrs(styles.link)}
					>
						{collection().title}
					</Link>
				)}
			</Match>
		</Switch>
	)
}

function correctionReviewRequestedContent(
	body: NotificationBodyOfKind<"CorrectionReviewRequested">,
	onOpen: () => void,
): JSX.Element {
	const actor = (
		<UserLink
			user={body.actor}
			onOpen={onOpen}
		/>
	)
	const target = (
		<EntityLink
			entity={body.correction}
			onOpen={onOpen}
		/>
	)

	return (
		<Trans>
			{actor} requested your review on the correction to {target}.
		</Trans>
	)
}

function correctionUpdatedContent(
	body: NotificationBodyOfKind<"CorrectionUpdated">,
	onOpen: () => void,
): JSX.Element {
	const actor = (
		<UserLink
			user={body.actor}
			onOpen={onOpen}
		/>
	)
	const target = (
		<EntityLink
			entity={body.correction}
			onOpen={onOpen}
		/>
	)

	return (
		<Trans>
			{actor} updated the correction to {target}.
		</Trans>
	)
}

function correctionModeratedContent(
	body: NotificationBodyOfKind<"CorrectionModerated">,
	onOpen: () => void,
): JSX.Element {
	const { t } = useLingui()
	const target = (
		<EntityLink
			entity={body.correction}
			onOpen={onOpen}
		/>
	)
	const actionText = body.action === "Approved" ? t`approved` : t`rejected`

	return (
		<Trans>
			Your correction to {target} was {actionText}.
		</Trans>
	)
}

function commentThreadUpdatedContent(
	body: NotificationBodyOfKind<"CommentThreadUpdated">,
	onOpen: () => void,
): JSX.Element {
	const { t } = useLingui()
	const { listSeparator } = useI18N()
	const commenterItems: JSX.Element[] = body.commenters.map((commenter) => (
		<UserLink
			user={commenter}
			onOpen={onOpen}
		/>
	))
	const additionalCount = body.additional_commenter_count

	if (additionalCount > 0) {
		commenterItems.push(
			<Plural
				value={additionalCount}
				one="one other"
				other="# others"
			/>,
		)
	}

	const commenters = (
		<Intersperse
			of={commenterItems}
			with={listSeparator()}
		>
			{(commenter) => commenter}
		</Intersperse>
	)
	const target =
		body.container == null ? undefined : (
			<EntityLink
				entity={body.container}
				onOpen={onOpen}
			/>
		)

	const message =
		target == null ? (
			<Trans>{commenters} replied to [deleted].</Trans>
		) : (
			<Trans>
				{commenters} commented on {target}.
			</Trans>
		)

	if (body.latest.state === "Visible") {
		return message
	}

	return (
		<>
			{message}
			<p {...stylex.attrs(styles.comment)}>[{t`deleted comment`}]</p>
		</>
	)
}

function commentRepliedContent(
	body: NotificationBodyOfKind<"CommentReplied">,
	onOpen: () => void,
): JSX.Element {
	const { t } = useLingui()
	const actor = (
		<UserLink
			user={body.reply.actor}
			onOpen={onOpen}
		/>
	)
	const content =
		body.reply.state === "Visible"
			? body.reply.content
			: `[${t`deleted comment`}]`
	const target =
		body.container == null ? undefined : (
			<EntityLink
				entity={body.container}
				onOpen={onOpen}
			/>
		)
	const message =
		target == null ? (
			<Trans>{actor} replied to your comment under [deleted].</Trans>
		) : (
			<Trans>
				{actor} replied to your comment under {target}.
			</Trans>
		)

	if (!content) {
		return message
	}

	return (
		<>
			{message}
			<p {...stylex.attrs(styles.comment)}>{content}</p>
		</>
	)
}

function userFollowedContent(
	body: NotificationBodyOfKind<"UserFollowed">,
	onOpen: () => void,
): JSX.Element {
	const actor = (
		<UserLink
			user={body.actor}
			onOpen={onOpen}
		/>
	)

	return <Trans>{actor} followed you.</Trans>
}

function collectionFollowedContent(
	body: NotificationBodyOfKind<"CollectionFollowed">,
	onOpen: () => void,
): JSX.Element {
	const actor = (
		<UserLink
			user={body.actor}
			onOpen={onOpen}
		/>
	)
	const collection = (
		<CollectionLink
			collection={body.collection}
			onOpen={onOpen}
		/>
	)

	return (
		<Trans>
			{actor} followed your collection {collection}.
		</Trans>
	)
}

function collectionItemAddedContent(
	body: NotificationBodyOfKind<"CollectionItemAdded">,
	onOpen: () => void,
): JSX.Element {
	const actor = (
		<UserLink
			user={body.actor}
			onOpen={onOpen}
		/>
	)
	const collection = (
		<CollectionLink
			collection={body.collection}
			onOpen={onOpen}
		/>
	)

	return (
		<Trans>
			{actor}&apos;s list {collection} was updated.
		</Trans>
	)
}

function imageQueueModeratedContent(
	body: NotificationBodyOfKind<"ImageQueueModerated">,
	onOpen: () => void,
): JSX.Element {
	const { t } = useLingui()
	const target = (
		<EntityLink
			entity={body.image_queue}
			onOpen={onOpen}
		/>
	)
	const imageTypeText =
		body.image_type === "Profile" ? t`profile image` : t`cover art`
	const actionText =
		body.action === "Approved"
			? t`approved`
			: body.action === "Rejected"
				? t`rejected`
				: t`reverted`

	return (
		<Trans>
			The {imageTypeText} change to {target} was {actionText}.
		</Trans>
	)
}

function accountRoleChangedContent(
	body: NotificationBodyOfKind<"AccountRoleChanged">,
	onOpen: () => void,
): JSX.Element {
	const actor = (
		<UserLink
			user={body.actor}
			onOpen={onOpen}
		/>
	)
	const roles = body.new_roles.join(", ")

	if (roles) {
		return (
			<Trans>
				{actor} changed your roles to {roles}.
			</Trans>
		)
	}

	return <Trans>{actor} changed your roles.</Trans>
}

export function NotificationCard(props: {
	styles?: StyleXStyles
	item: NotificationItem
	now?: number
	setRead: (item: NotificationItem, read: boolean) => void
	setSaved: (item: NotificationItem, saved: boolean) => void
	isUpdatingRead: boolean
	isUpdatingSaved: boolean
}) {
	const { t } = useLingui()
	const locale = useI18N().locale
	const saved = () => props.item.saved_at != null

	const open = () => props.setRead(props.item, true)

	const notificationBody = (): JSX.Element => {
		const body = props.item.body

		switch (body.kind) {
			case "CorrectionReviewRequested": {
				return correctionReviewRequestedContent(body, open)
			}
			case "CorrectionUpdated": {
				return correctionUpdatedContent(body, open)
			}
			case "CorrectionModerated": {
				return correctionModeratedContent(body, open)
			}
			case "CommentThreadUpdated": {
				return commentThreadUpdatedContent(body, open)
			}
			case "CommentReplied": {
				return commentRepliedContent(body, open)
			}
			case "UserFollowed": {
				return userFollowedContent(body, open)
			}
			case "CollectionFollowed": {
				return collectionFollowedContent(body, open)
			}
			case "CollectionItemAdded": {
				return collectionItemAddedContent(body, open)
			}
			case "ImageQueueModerated": {
				return imageQueueModeratedContent(body, open)
			}
			case "AccountRoleChanged": {
				return accountRoleChangedContent(body, open)
			}
		}
	}

	return (
		<article {...stylex.attrs(styles.notification, props.styles)}>
			<div
				{...stylex.attrs(
					styles.body,
					props.item.is_unread ? styles.unread : styles.read,
				)}
			>
				{notificationBody()}
				<div {...stylex.attrs(styles.timestamp)}>
					{formatRelativeTime(
						props.item.last_activity_at,
						props.now ?? Date.now(),
						locale(),
						t`Just now`,
					)}
				</div>
			</div>
			<div {...stylex.attrs(styles.actions)}>
				<Button
					aria-label={saved() ? t`Unsave` : t`Save`}
					title={saved() ? t`Unsave` : t`Save`}
					disabled={props.isUpdatingSaved}
					onClick={() => props.setSaved(props.item, !saved())}
					appearance="ghost"
					tone="gray"
					styles={styles.action}
				>
					<Show
						when={saved()}
						fallback={<BookmarkIcon />}
					>
						<BookmarkFilledIcon />
					</Show>
				</Button>
				<Button
					aria-label={props.item.is_unread ? t`Mark read` : t`Mark unread`}
					title={props.item.is_unread ? t`Mark read` : t`Mark unread`}
					disabled={props.isUpdatingRead}
					onClick={() => props.setRead(props.item, props.item.is_unread)}
					appearance="ghost"
					tone="gray"
					styles={styles.action}
				>
					<Show
						when={props.item.is_unread}
						fallback={<EnvelopeClosedIcon />}
					>
						<EnvelopeOpenIcon />
					</Show>
				</Button>
			</div>
		</article>
	)
}
