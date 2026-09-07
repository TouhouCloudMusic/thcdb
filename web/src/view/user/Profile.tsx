import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { UserProfile, UserRoleEnum } from "@thc/api"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"

import type { AppColor } from "~/component"
import { Badge } from "~/component/atomic/Badge"
import { inputStyles } from "~/component/atomic/Input"
import { Tab } from "~/component/atomic/Tab"
import { Avatar } from "~/component/atomic/avatar"
import { Button, buttonStyles } from "~/component/atomic/button"
import type { ToolbarSelectOption } from "~/component/atomic/form/ToolbarSelect"
import {
	toolbarStyles,
	ToolbarSelect,
} from "~/component/atomic/form/ToolbarSelect"
import { Markdown } from "~/component/markdown"
import { USER_ROLE_NAMES } from "~/domain/user/constants"
import type { UserCollection } from "~/hey-api"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	colors,
	fonts,
	lineHeights,
	fontSizes,
	px,
	radius,
} from "~/style/tokens.stylex"
import { imgUrl } from "~/utils/adapter/static_file"
import { CollectionFormDialog } from "~/view/collection/CollectionFormDialog"
import { CollectionLoadMore } from "~/view/collection/CollectionLoadMore"
import { FollowedCollectionRow } from "~/view/collection/FollowedCollectionRow"

import { animationStyles } from "../../style/animations.stylex"

const styles = stylex.create({
	page: {
		minHeight: "100%",
		backgroundColor: colors.backgroundPrimary,
		fontFamily: fonts.sans,
		paddingBottom: px[48],
	},
	banner: {
		width: "100%",
		height: {
			default: px[128],
			"@media (min-width: 40rem)": px[192],
			"@media (min-width: 64rem)": px[256],
		},
		backgroundColor: colors.backgroundSecondary,
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[200],
	},
	bannerFallback: { width: "100%", height: "100%" },
	bannerImage: {
		width: "100%",
		height: "100%",
		objectFit: "cover",
		objectPosition: "center",
	},
	layout: {
		marginInline: "auto",
		maxWidth: "1200px",
		paddingInline: {
			default: px[24],
			"@media (min-width: 40rem)": px[32],
			"@media (min-width: 64rem)": px[48],
		},
		display: "flex",
		flexDirection: { default: "column", "@media (min-width: 64rem)": "row" },
		gap: { default: px[48], "@media (min-width: 64rem)": px[64] },
		paddingTop: { default: px[24], "@media (min-width: 64rem)": "0rem" },
	},
	sidebar: {
		width: {
			default: "100%",
			"@media (min-width: 64rem)": px[256],
			"@media (min-width: 80rem)": px[288],
		},
		flexShrink: 0,
		display: "flex",
		flexDirection: "column",
	},
	avatarPosition: {
		marginTop: {
			default: null,
			"@media (min-width: 40rem)": "-4rem",
			"@media (min-width: 64rem)": "-6rem",
		},
		marginBottom: px[20],
	},
	avatar: {
		width: { default: px[128], "@media (min-width: 40rem)": px[160] },
		height: { default: px[128], "@media (min-width: 40rem)": px[160] },
		borderRadius: radius.full,
		borderWidth: "4px",
		borderStyle: "solid",
		borderColor: palette.white,
		backgroundColor: palette.white,
		boxShadow: `0 0 0 1px ${palette.slate[200]}`,
	},
	name: {
		fontSize: fontSizes["2xl"],
		lineHeight: 1.25,
		color: colors.textPrimary,
	},
	roles: {
		marginTop: px[8],
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[8],
	},
	actions: {
		marginTop: px[24],
		width: "100%",
		maxWidth: { default: "240px", "@media (min-width: 64rem)": "none" },
	},
	biography: {
		marginTop: px[32],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	metrics: {
		marginTop: px[32],
		paddingTop: px[24],
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderColor: palette.slate[100],
	},
	main: {
		marginTop: px[8],
		display: "flex",
		minWidth: "0rem",
		flex: "1 1 0%",
		flexDirection: "column",
		gap: px[56],
	},
	actionList: { display: "flex", flexDirection: "column", gap: px[8] },
	actionError: { fontSize: fontSizes.sm, lineHeight: "1.25rem" },
	about: { display: "flex", flexDirection: "column", gap: px[12] },
	aboutTitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textPrimary,
		letterSpacing: ".025em",
	},
	emptyBio: {
		color: palette.slate[500],
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
	},
	metricList: { display: "flex", flexDirection: "column", gap: px[12] },
	metric: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
	},
	metricLabel: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[600],
	},
	metricValue: {
		fontSize: fontSizes.base,
		lineHeight: 1.5,
		color: colors.textPrimary,
		fontVariantNumeric: "tabular-nums",
	},
	pins: { display: "flex", flexDirection: "column", gap: px[20] },
	pinsTitle: {
		fontSize: fontSizes.lg,
		lineHeight: lineHeights.lg,
		color: colors.textPrimary,
		paddingBottom: px[8],
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[100],
	},
	pinGrid: {
		display: "grid",
		gap: px[20],
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 40rem)": "repeat(2, minmax(0, 1fr))",
			"@media (min-width: 80rem)": "repeat(3, minmax(0, 1fr))",
		},
	},
	pin: {
		display: "flex",
		flexDirection: "column",
		height: "100%",
		backgroundColor: colors.backgroundPrimary,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: {
			default: palette.slate[200],
			":hover": { default: null, "@media (hover: hover)": palette.slate[300] },
		},
		borderRadius: radius.md,
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		textDecorationLine: {
			default: "none",
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
		outlineStyle: "none",
		overflow: "hidden",
	},
	pinCover: {
		aspectRatio: "16 / 9",
		width: "100%",
		overflow: "hidden",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[100],
	},
	pinImage: {
		opacity: {
			default: null,
			"@media (hover: hover)": {
				default: null,
				[stylex.when.ancestor(":hover")]: 0.9,
			},
		},
		width: "100%",
		height: "100%",
		objectFit: "cover",
		transitionProperty: "opacity",
		transitionDuration: "300ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	pinFallback: {
		aspectRatio: "16 / 9",
		width: "100%",
		overflow: "hidden",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[100],
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
	},
	pinKindFallback: {
		color: palette.slate[400],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: ".025em",
	},
	pinBody: {
		display: "flex",
		flexDirection: "column",
		flex: "1 1 0%",
		padding: px[16],
	},
	pinHeading: {
		display: "flex",
		alignItems: "center",
		marginBottom: px[4],
	},
	pinKind: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		color: palette.slate[500],
	},
	pinTitle: {
		fontSize: fontSizes.base,
		lineHeight: 1.25,
		color: {
			default: colors.textPrimary,
			"@media (hover: hover)": {
				default: null,
				[stylex.when.ancestor(":hover")]: palette.blue[600],
			},
		},
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 2,
		marginBottom: px[4],
	},
	pinSubtitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 2,
		marginTop: "auto",
	},
	tabs: { display: "flex", flexDirection: "column", gap: px[20] },
	tab: { width: "100%", paddingBlock: px[12] },
	emptySection: {
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		borderRadius: radius.md,
		paddingInline: px[24],
		paddingBlock: px[40],
		textAlign: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	activityDate: {
		width: px[128],
		flexShrink: 0,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
		paddingTop: { default: null, "@media (min-width: 40rem)": px[2] },
	},
	activityContent: { flex: "1 1 0%", minWidth: "0rem" },
	activitySummary: {
		fontSize: "15px",
		color: colors.textPrimary,
		lineHeight: 1.375,
	},
	activityAction: { color: palette.slate[500], marginRight: px[8] },
	activityDetail: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
		marginTop: px[4],
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},
	activityEntity: { color: colors.textPrimary },
	activityLink: {
		color: colors.textPrimary,
		textDecorationLine: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "underline" },
		},
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	roleBadge: {
		borderRadius: radius.md,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: colors.backgroundPrimary,
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
		paddingInline: px[8],
		paddingBlock: px[2],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
	},
	collections: { display: "flex", flexDirection: "column", gap: px[20] },
	toolbar: {
		display: "flex",
		flexDirection: { default: "column", "@media (min-width: 80rem)": "row" },
		gap: px[12],
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[200],
		paddingBottom: px[16],
		alignItems: { default: null, "@media (min-width: 80rem)": "center" },
		justifyContent: {
			default: null,
			"@media (min-width: 80rem)": "space-between",
		},
	},
	filters: {
		display: "flex",
		flexDirection: { default: "column", "@media (min-width: 40rem)": "row" },
		gap: px[8],
		flex: "1 1 0%",
		minWidth: "0rem",
		alignItems: { default: null, "@media (min-width: 40rem)": "center" },
	},
	typeFilter: {
		width: { default: "100%", "@media (min-width: 40rem)": "auto" },
	},
	visibilityFilter: {
		width: { default: "100%", "@media (min-width: 40rem)": "auto" },
	},
	sortFilter: {
		width: { default: "100%", "@media (min-width: 40rem)": "auto" },
	},
	collectionList: {
		borderBlockWidth: "1px",
		borderBlockStyle: "solid",
		borderColor: palette.slate[200],
	},
	activityList: { display: "flex", flexDirection: "column" },
	collection: {
		display: "grid",
		gap: px[12],
		paddingInline: {
			default: px[4],
			"@media (min-width: 40rem)": px[12],
		},
		paddingBlock: px[16],
		textDecorationLine: "none",
		outlineStyle: "none",
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
		gridTemplateColumns: {
			default: null,
			"@media (min-width: 40rem)": "minmax(0,1fr) auto",
		},
		alignItems: { default: null, "@media (min-width: 40rem)": "center" },
	},
	collectionContent: { minWidth: "0rem" },
	collectionHeading: {
		display: "flex",
		minWidth: "0rem",
		alignItems: "baseline",
		gap: px[8],
	},
	collectionName: {
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: "15px",
		fontWeight: 500,
		color: palette.slate[900],
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	visibility: {
		fontSize: fontSizes.xs,
		lineHeight: "1rem",
		color: colors.textTertiary,
	},
	collectionDescription: {
		marginTop: px[4],
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 1,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
	collectionMetadata: {
		display: "flex",
		alignItems: "center",
		gap: px[16],
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
		justifyContent: { default: null, "@media (min-width: 40rem)": "flex-end" },
	},
	itemCount: { fontVariantNumeric: "tabular-nums" },
	collectionArrow: {
		color: {
			default: palette.slate[300],
			"@media (hover: hover)": {
				default: null,
				[stylex.when.ancestor(":hover")]: palette.slate[500],
			},
		},
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
})

const profileStyles = stylex.create({
	collectionRow: {
		borderBottomWidth: { default: "1px", ":last-child": 0 },
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[100],
	},
	action: {
		width: "100%",
		justifyContent: "center",
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		paddingInline: px[16],
		paddingBlock: px[8],
	},
	bio: { lineHeight: 1.625, maxWidth: "none", color: colors.textSecondary },
	parsing: { opacity: 0.5 },
	activity: {
		display: "flex",
		flexDirection: { default: "column", "@media (min-width: 40rem)": "row" },
		gap: { default: px[8], "@media (min-width: 40rem)": px[16] },
		paddingBlock: px[16],
	},
	activityDivider: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[100],
	},
	tabs: {
		display: "inline-grid",
		width: "fit-content",
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
	},
	search: {
		width: "100%",
		minWidth: "200px",
		flex: "1 1 0%",
		paddingInline: px[12],
		color: {
			default: colors.textPrimary,
			"::placeholder": colors.textSecondary,
		},
	},
	newCollection: {
		paddingInline: px[12],
		boxShadow: {
			default: "0 0 #0000",
			":hover": { default: null, "@media (hover: hover)": "0 0 #0000" },
		},
	},
})

type ProfileTabValue = "collections" | "activity"
type ProfileTabState = {
	value: ProfileTabValue
	onChange: (value: ProfileTabValue) => void
}

export type ProfileData = Pick<
	UserProfile,
	"name" | "avatar_url" | "banner_url" | "is_following" | "bio" | "stats"
>

type Props = {
	data: ProfileData
	roles: UserProfile["roles"]
	isCurrentUser: boolean
	pins: readonly PinItem[]
	activity: readonly ActivityItem[]
	tab?: ProfileTabState
	action?: ProfileActionProps
	collections: readonly UserCollection[]
	hasMoreCollections: boolean
	isFetchingMoreCollections: boolean
	onLoadMoreCollections: () => void
	followedCollections?: readonly {
		followed_at: string
		collection: UserCollection
	}[]
	hasMoreFollowedCollections?: boolean
	isFetchingMoreFollowedCollections?: boolean
	onLoadMoreFollowedCollections?: () => void
}

const enum UserType {
	Current,
	Following,
	Unfollowed,
}

type Metric = {
	label: string
	value: string
}

type CollectionVisibilityFilter = "all" | "public" | "private"
type CollectionSortValue = "newest" | "name" | "items"
type CollectionType = "own" | "followed"

export type ActivityItem = {
	at: string
	accent: AppColor
	action: string
	entity: string
	detail: string
	link?:
		| { to: "/release/$id"; params: { id: string } }
		| { to: "/song/$id"; params: { id: string } }
		| { to: "/artist/$id"; params: { id: string } }
		| { to: "/tag/$id"; params: { id: string } }
		| { to: "/event/$id"; params: { id: string } }
		| { to: "/label/$id"; params: { id: string } }
}

export type PinItem = {
	accent: AppColor
	kind: string
	title: string
	subtitle: string
	coverUrl?: string
	to:
		| { to: "/release/$id"; params: { id: string } }
		| { to: "/song/$id"; params: { id: string } }
		| { to: "/artist/$id"; params: { id: string } }
		| { to: "/tag/$id"; params: { id: string } }
		| { to: "/event/$id"; params: { id: string } }
		| { to: "/label/$id"; params: { id: string } }
}

const PROFILE_TAB_ITEMS = [
	{
		value: "activity" as const,
	},
	{
		value: "collections" as const,
	},
]

const COLLECTION_VISIBILITY_FILTERS = [
	{
		value: "all" as const,
	},
	{
		value: "public" as const,
	},
	{
		value: "private" as const,
	},
]

const COLLECTION_SORT_OPTIONS = [
	{
		value: "newest" as const,
	},
	{
		value: "name" as const,
	},
	{
		value: "items" as const,
	},
]

export function Profile(props: Props) {
	const { t } = useLingui()
	const userType = createMemo(() => {
		if (props.isCurrentUser) {
			return UserType.Current
		}
		if (props.data.is_following) {
			return UserType.Following
		}
		return UserType.Unfollowed
	})

	const metrics = createMemo<Metric[]>(() => {
		return [
			{
				label: t`Edits`,
				value: String(props.data.stats.edit_count),
			},
			{
				label: t`Votes`,
				value: String(props.data.stats.vote_count),
			},
		]
	})

	const bannerUrl = createMemo(() => imgUrl(props.data.banner_url))
	const topRole = createMemo<UserRoleEnum | null>(() => {
		const roles = props.roles ?? []
		if (roles.length === 0) return null
		if (roles.some((role) => role.name === USER_ROLE_NAMES.Admin)) {
			return USER_ROLE_NAMES.Admin
		}
		if (roles.some((role) => role.name === USER_ROLE_NAMES.Moderator)) {
			return USER_ROLE_NAMES.Moderator
		}
		return USER_ROLE_NAMES.User
	})

	return (
		<PageLayout styles={styles.page}>
			{/* Simple banner without styling tricks */}
			<div {...stylex.attrs(styles.banner)}>
				<Show
					when={bannerUrl()}
					fallback={<div {...stylex.attrs(styles.bannerFallback)}></div>}
				>
					{(src) => (
						<img
							src={src()}
							alt={t`Profile banner`}
							{...stylex.attrs(styles.bannerImage)}
						/>
					)}
				</Show>
			</div>

			<div {...stylex.attrs(styles.layout)}>
				{/* Standard left sidebar */}
				<aside {...stylex.attrs(styles.sidebar)}>
					<div {...stylex.attrs(styles.avatarPosition)}>
						<Avatar
							user={props.data}
							styles={styles.avatar}
						/>
					</div>

					<h1 {...stylex.attrs(styles.name)}>{props.data.name}</h1>

					<div {...stylex.attrs(styles.roles)}>
						<Show when={topRole()}>
							{(role) => <RoleBadge role={role()} />}
						</Show>
					</div>

					<Show when={props.isCurrentUser || props.action !== undefined}>
						<div {...stylex.attrs(styles.actions)}>
							<ProfileActionButton
								userType={userType()}
								pendingAction={props.action?.pendingAction}
								errorMessage={props.action?.errorMessage}
								onFollow={props.action?.onFollow}
								onUnfollow={props.action?.onUnfollow}
							/>
						</div>
					</Show>

					<div {...stylex.attrs(styles.biography)}>
						<AboutSection user={props.data} />
					</div>

					<div {...stylex.attrs(styles.metrics)}>
						<MetricsSection metrics={metrics()} />
					</div>
				</aside>

				{/* Main content */}
				<main {...stylex.attrs(styles.main)}>
					<CollectionsAndActivitySection
						defaultValue={props.tab?.value ?? "activity"}
						tab={props.tab}
						collections={props.collections}
						hasMoreCollections={props.hasMoreCollections}
						isFetchingMoreCollections={props.isFetchingMoreCollections}
						onLoadMoreCollections={props.onLoadMoreCollections}
						followedCollections={props.followedCollections}
						hasMoreFollowedCollections={props.hasMoreFollowedCollections}
						isFetchingMoreFollowedCollections={
							props.isFetchingMoreFollowedCollections
						}
						onLoadMoreFollowedCollections={props.onLoadMoreFollowedCollections}
						isCurrentUser={props.isCurrentUser}
						activity={props.activity}
					/>
					<Show when={props.pins.length > 0}>
						<PinsSection items={props.pins} />
					</Show>
				</main>
			</div>
		</PageLayout>
	)
}

type ProfileActionButtonProps = {
	userType: UserType
	pendingAction?: "follow" | "unfollow"
	errorMessage?: string
	onFollow?: () => void
	onUnfollow?: () => void
}

type ProfileActionProps = Pick<
	ProfileActionButtonProps,
	"pendingAction" | "errorMessage" | "onFollow" | "onUnfollow"
>

function ProfileActionButton(props: ProfileActionButtonProps) {
	const { t } = useLingui()
	const [hovering, setHovering] = createSignal(false)

	const onMouseEnter = () => setHovering(true)
	const onMouseLeave = () => setHovering(false)

	return (
		<div {...stylex.attrs(styles.actionList)}>
			<Switch>
				<Match when={props.userType === UserType.Current}>
					<Link
						to="/profile/edit"
						class={
							stylex.attrs(
								link.base,
								buttonStyles.base,
								buttonStyles.outline,
								buttonStyles.gray,
								buttonStyles.md,
								profileStyles.action,
							).class
						}
					>
						Edit Profile
					</Link>
				</Match>

				<Match when={props.userType === UserType.Unfollowed}>
					<Button
						disabled={props.pendingAction !== undefined}
						onClick={props.onFollow}
						appearance="outline"
						tone="slate"
						size="md"
						styles={profileStyles.action}
					>
						{props.pendingAction === "follow" ? t`Following...` : t`Follow`}
					</Button>
				</Match>

				<Match when={props.userType === UserType.Following}>
					<Button
						disabled={props.pendingAction !== undefined}
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
						onClick={props.onUnfollow}
						appearance="outline"
						tone="slate"
						size="md"
						styles={profileStyles.action}
					>
						<Switch>
							<Match when={props.pendingAction === "unfollow"}>
								Unfollowing...
							</Match>
							<Match when={hovering()}>{t`Unfollow`}</Match>
							<Match when={!hovering()}>{t`Following`}</Match>
						</Switch>
					</Button>
				</Match>
			</Switch>

			<Show when={props.errorMessage}>
				<div {...stylex.attrs(styles.actionError)}>{props.errorMessage}</div>
			</Show>
		</div>
	)
}

function AboutSection(props: { user: Pick<ProfileData, "bio"> }) {
	const { t } = useLingui()
	const [mdParsing, setMdParsing] = createSignal(true)
	const bio = createMemo(() => props.user.bio)
	const shouldPulse = createMemo(() => Boolean(bio()) && mdParsing())
	const onRendered = () => setMdParsing(false)

	return (
		<div {...stylex.attrs(styles.about)}>
			<h2 {...stylex.attrs(styles.aboutTitle)}>{t`About`}</h2>
			<div
				{...stylex.attrs(
					profileStyles.bio,
					shouldPulse() && [animationStyles.pulse, profileStyles.parsing],
				)}
			>
				<Show
					when={bio()}
					fallback={
						<span {...stylex.attrs(styles.emptyBio)}>
							{t`No biography provided.`}
						</span>
					}
				>
					<Markdown
						content={bio()}
						onRendered={onRendered}
					/>
				</Show>
			</div>
		</div>
	)
}

function MetricsSection(props: { metrics: Metric[] }) {
	return (
		<div {...stylex.attrs(styles.metricList)}>
			<For each={props.metrics}>
				{(metric) => (
					<div {...stylex.attrs(styles.metric)}>
						<span {...stylex.attrs(styles.metricLabel)}>{metric.label}</span>
						<span {...stylex.attrs(styles.metricValue)}>{metric.value}</span>
					</div>
				)}
			</For>
		</div>
	)
}

function PinsSection(props: { items: readonly PinItem[] }) {
	return (
		<section {...stylex.attrs(styles.pins)}>
			<h2 {...stylex.attrs(styles.pinsTitle)}>Highlights</h2>

			<div {...stylex.attrs(styles.pinGrid)}>
				<For each={props.items}>{(item) => <PinCard item={item} />}</For>
			</div>
		</section>
	)
}

function PinCard(props: { item: PinItem }) {
	return (
		<Link
			to={props.item.to.to}
			params={props.item.to.params}
			class={
				stylex.attrs(link.base, link.text, stylex.defaultMarker(), styles.pin)
					.class
			}
		>
			<Show when={props.item.coverUrl}>
				{(src) => (
					<div {...stylex.attrs(styles.pinCover)}>
						<img
							src={src()}
							alt=""
							loading="lazy"
							{...stylex.attrs(styles.pinImage)}
						/>
					</div>
				)}
			</Show>

			<Show when={!props.item.coverUrl}>
				<div {...stylex.attrs(styles.pinFallback)}>
					<span {...stylex.attrs(styles.pinKindFallback)}>
						{props.item.kind}
					</span>
				</div>
			</Show>

			<div {...stylex.attrs(styles.pinBody)}>
				<div {...stylex.attrs(styles.pinHeading)}>
					<span {...stylex.attrs(styles.pinKind)}>{props.item.kind}</span>
				</div>
				<h3 {...stylex.attrs(styles.pinTitle)}>{props.item.title}</h3>
				<p {...stylex.attrs(styles.pinSubtitle)}>{props.item.subtitle}</p>
			</div>
		</Link>
	)
}

function toProfileTabValue(value: string): ProfileTabValue {
	if (value === "collections") return "collections"
	return "activity"
}

function CollectionsAndActivitySection(props: {
	defaultValue: ProfileTabValue
	tab?: ProfileTabState
	collections: readonly UserCollection[]
	hasMoreCollections: boolean
	isFetchingMoreCollections: boolean
	onLoadMoreCollections: () => void
	followedCollections?: readonly {
		followed_at: string
		collection: UserCollection
	}[]
	hasMoreFollowedCollections?: boolean
	isFetchingMoreFollowedCollections?: boolean
	onLoadMoreFollowedCollections?: () => void
	isCurrentUser: boolean
	activity: readonly ActivityItem[]
}) {
	const onTabChange = (value: string) => {
		props.tab?.onChange(toProfileTabValue(value))
	}

	return (
		<section>
			<Tab.Root
				defaultValue={props.defaultValue}
				value={props.tab?.value}
				onChange={props.tab === undefined ? undefined : onTabChange}
				styles={styles.tabs}
			>
				<Tab.List styles={[Tab.containerStyles, profileStyles.tabs]}>
					<For each={PROFILE_TAB_ITEMS}>
						{(item) => (
							<Tab.Trigger
								value={item.value}
								styles={styles.tab}
							>
								<ProfileTabLabel value={item.value} />
							</Tab.Trigger>
						)}
					</For>
					<Tab.Indicator />
				</Tab.List>

				<Tab.Content value="activity">
					<ActivityPanel items={props.activity} />
				</Tab.Content>

				<Tab.Content value="collections">
					<CollectionsPanel
						items={props.collections}
						hasMoreItems={props.hasMoreCollections}
						isFetchingMoreItems={props.isFetchingMoreCollections}
						onLoadMore={props.onLoadMoreCollections}
						followedItems={props.followedCollections}
						hasMoreFollowedItems={props.hasMoreFollowedCollections}
						isFetchingMoreFollowedItems={
							props.isFetchingMoreFollowedCollections
						}
						onLoadMoreFollowedItems={props.onLoadMoreFollowedCollections}
						isCurrentUser={props.isCurrentUser}
					/>
				</Tab.Content>
			</Tab.Root>
		</section>
	)
}

function ProfileTabLabel(props: { value: ProfileTabValue }) {
	const { t } = useLingui()

	const label = () => {
		switch (props.value) {
			case "activity": {
				return t`Activity`
			}
			case "collections": {
				return t`Collections`
			}
		}
	}

	return <>{label()}</>
}

function SectionEmptyState(props: { message: string }) {
	return <div {...stylex.attrs(styles.emptySection)}>{props.message}</div>
}

function ActivityRow(props: { item: ActivityItem; isLast: boolean }) {
	return (
		<div
			{...stylex.attrs(
				profileStyles.activity,
				!props.isLast && profileStyles.activityDivider,
			)}
		>
			<div {...stylex.attrs(styles.activityDate)}>
				{formatDateTime(props.item.at)}
			</div>

			<div {...stylex.attrs(styles.activityContent)}>
				<div {...stylex.attrs(styles.activitySummary)}>
					<span {...stylex.attrs(styles.activityAction)}>
						{props.item.action}
					</span>
					<ActivityEntity item={props.item} />
				</div>

				<Show when={props.item.detail}>
					<div {...stylex.attrs(styles.activityDetail)}>
						{props.item.detail}
					</div>
				</Show>
			</div>
		</div>
	)
}

function ActivityEntity(props: { item: ActivityItem }) {
	return (
		<Show
			when={props.item.link}
			fallback={
				<span {...stylex.attrs(styles.activityEntity)}>
					{props.item.entity}
				</span>
			}
		>
			{(l) => (
				<Link
					to={l().to}
					params={l().params}
					class={stylex.attrs(link.base, link.text, styles.activityLink).class}
				>
					{props.item.entity}
				</Link>
			)}
		</Show>
	)
}

function RoleBadge(props: { role: UserRoleEnum }) {
	return (
		<Show when={props.role !== "User"}>
			<Badge
				color={roleColor(props.role)}
				styles={styles.roleBadge}
			>
				{props.role}
			</Badge>
		</Show>
	)
}

function CollectionsPanel(props: {
	items: readonly UserCollection[]
	hasMoreItems: boolean
	isFetchingMoreItems: boolean
	onLoadMore: () => void
	isCurrentUser: boolean
	followedItems?: readonly {
		followed_at: string
		collection: UserCollection
	}[]
	hasMoreFollowedItems?: boolean
	isFetchingMoreFollowedItems?: boolean
	onLoadMoreFollowedItems?: () => void
}) {
	const { t } = useLingui()
	const [collectionFormOpen, setCollectionFormOpen] = createSignal(false)
	const [searchQuery, setSearchQuery] = createSignal("")
	const [collectionType, setCollectionType] =
		createSignal<CollectionType>("own")
	const [visibilityFilter, setVisibilityFilter] =
		createSignal<CollectionVisibilityFilter>("all")
	const [sortValue, setSortValue] = createSignal<CollectionSortValue>("newest")
	const collectionTypeOptions = (): ToolbarSelectOption<CollectionType>[] => [
		{
			value: "own",
			label: t`Type: Own`,
			itemLabel: t`Own`,
		},
		{
			value: "followed",
			label: t`Type: Followed`,
			itemLabel: t`Followed`,
		},
	]
	const visibilityOptions =
		(): ToolbarSelectOption<CollectionVisibilityFilter>[] =>
			COLLECTION_VISIBILITY_FILTERS.map((option) => {
				switch (option.value) {
					case "all": {
						return {
							value: option.value,
							label: t`Visibility: All`,
							itemLabel: t`All`,
						}
					}
					case "public": {
						return {
							value: option.value,
							label: t`Visibility: Public`,
							itemLabel: t`Public`,
						}
					}
					case "private": {
						return {
							value: option.value,
							label: t`Visibility: Private`,
							itemLabel: t`Private`,
						}
					}
				}
			})
	const sortOptions = (): ToolbarSelectOption<CollectionSortValue>[] =>
		COLLECTION_SORT_OPTIONS.map((option) => {
			switch (option.value) {
				case "newest": {
					if (collectionType() === "followed") {
						return {
							value: option.value,
							label: t`Sort: Followed time`,
							itemLabel: t`Followed time`,
						}
					}
					return {
						value: option.value,
						label: t`Sort: Created time`,
						itemLabel: t`Created time`,
					}
				}
				case "name": {
					return {
						value: option.value,
						label: t`Sort: Alphabetical`,
						itemLabel: t`Alphabetical`,
					}
				}
				case "items": {
					return {
						value: option.value,
						label: t`Sort: Item count`,
						itemLabel: t`Item count`,
					}
				}
			}
		})

	const collections = createMemo(() =>
		collectionType() === "own"
			? props.items
			: (props.followedItems?.map((item) => item.collection) ?? []),
	)

	const visibleItems = createMemo(() => {
		const keyword = searchQuery().trim().toLocaleLowerCase()
		const visibility = visibilityFilter()
		const sort = sortValue()

		const items = collections()
			.filter((item) => {
				if (visibility === "public") return item.is_public
				if (visibility === "private") return !item.is_public
				return true
			})
			.filter((item) => {
				if (keyword.length === 0) return true
				return `${item.name} ${item.description}`
					.toLocaleLowerCase()
					.includes(keyword)
			})

		return [...items].sort((a, b) => compareCollections(a, b, sort))
	})

	const currentHasMoreItems = createMemo(() => {
		if (collectionType() === "own") return props.hasMoreItems
		return props.hasMoreFollowedItems ?? false
	})

	const currentIsFetchingMoreItems = createMemo(() => {
		if (collectionType() === "own") return props.isFetchingMoreItems
		return props.isFetchingMoreFollowedItems ?? false
	})

	const currentOnLoadMore = () => {
		if (collectionType() === "own") {
			props.onLoadMore()
		} else {
			props.onLoadMoreFollowedItems?.()
		}
	}

	const emptyMessage = createMemo(() => {
		if (collections().length > 0) return t`No collections match the filters`
		if (collectionType() === "followed")
			return t`You haven't followed any collections yet`
		if (props.isCurrentUser) return t`You haven't created any collections yet`
		return t`No collections found`
	})

	return (
		<div {...stylex.attrs(styles.collections)}>
			<div {...stylex.attrs(styles.toolbar)}>
				<div {...stylex.attrs(styles.filters)}>
					<input
						type="search"
						value={searchQuery()}
						placeholder={t`Search collections`}
						aria-label={t`Search collections`}
						onInput={(e) => setSearchQuery(e.currentTarget.value)}
						{...stylex.attrs(
							inputStyles.like,
							inputStyles.input,
							toolbarStyles.control,
							profileStyles.search,
						)}
					/>

					<Show when={props.isCurrentUser}>
						<ToolbarSelect
							options={collectionTypeOptions()}
							value={collectionType()}
							placeholder={t`Type`}
							ariaLabel={t`Collection type`}
							onChange={setCollectionType}
							styles={styles.typeFilter}
						/>
					</Show>

					<ToolbarSelect
						options={visibilityOptions()}
						value={visibilityFilter()}
						placeholder={t`Visibility`}
						ariaLabel={t`Filter collections`}
						onChange={setVisibilityFilter}
						styles={styles.visibilityFilter}
					/>

					<ToolbarSelect
						options={sortOptions()}
						value={sortValue()}
						placeholder={t`Sort`}
						ariaLabel={t`Sort collections`}
						onChange={setSortValue}
						styles={styles.sortFilter}
					/>

					<Show when={props.isCurrentUser}>
						<Button
							aria-label={t`New collection`}
							onClick={() => setCollectionFormOpen(true)}
							appearance="outline"
							tone="slate"
							size="sm"
							styles={[toolbarStyles.control, profileStyles.newCollection]}
						>
							{t({ message: "New", context: "Collection action" })}
						</Button>
					</Show>
				</div>
			</div>

			<Show
				when={visibleItems().length > 0}
				fallback={<SectionEmptyState message={emptyMessage()} />}
			>
				<ul {...stylex.attrs(styles.collectionList)}>
					<For each={visibleItems()}>
						{(item) => (
							<Show
								when={collectionType() === "followed"}
								fallback={<CollectionRow item={item} />}
							>
								<FollowedCollectionRow
									item={item}
									styles={profileStyles.collectionRow}
								/>
							</Show>
						)}
					</For>
				</ul>
			</Show>

			<div>
				<CollectionLoadMore
					when={currentHasMoreItems() || currentIsFetchingMoreItems()}
					isLoading={currentIsFetchingMoreItems()}
					onLoadMore={currentOnLoadMore}
				/>
			</div>

			<Show when={collectionFormOpen()}>
				<CollectionFormDialog
					open={collectionFormOpen()}
					onOpenChange={setCollectionFormOpen}
				/>
			</Show>
		</div>
	)
}

function compareCollections(
	a: UserCollection,
	b: UserCollection,
	sort: CollectionSortValue,
): number {
	switch (sort) {
		case "name": {
			return a.name.localeCompare(b.name)
		}
		case "items": {
			return b.item_count - a.item_count
		}
		case "newest": {
			return compareCollectionTime(a, b)
		}
	}
}

function compareCollectionTime(a: UserCollection, b: UserCollection) {
	const followedAtA = a.followed_at
	const followedAtB = b.followed_at

	if (followedAtA != null && followedAtB != null) {
		return followedAtB.localeCompare(followedAtA)
	}

	return b.id - a.id
}

function ActivityPanel(props: { items: readonly ActivityItem[] }) {
	const { t } = useLingui()
	return (
		<Show
			when={props.items.length > 0}
			fallback={<SectionEmptyState message={t`No activity`} />}
		>
			<div {...stylex.attrs(styles.activityList)}>
				<For each={props.items}>
					{(item, index) => (
						<ActivityRow
							item={item}
							isLast={index() === props.items.length - 1}
						/>
					)}
				</For>
			</div>
		</Show>
	)
}

export function CollectionRow(props: { item: UserCollection }) {
	const { t } = useLingui()
	return (
		<li {...stylex.attrs(profileStyles.collectionRow)}>
			<Link
				to="/collection/$id"
				params={{ id: props.item.id.toString() }}
				class={
					stylex.attrs(link.base, stylex.defaultMarker(), styles.collection)
						.class
				}
			>
				<div {...stylex.attrs(styles.collectionContent)}>
					<div {...stylex.attrs(styles.collectionHeading)}>
						<h3 {...stylex.attrs(styles.collectionName)}>{props.item.name}</h3>
						<span {...stylex.attrs(styles.visibility)}>
							{props.item.is_public ? t`Public` : t`Private`}
						</span>
					</div>
					<p {...stylex.attrs(styles.collectionDescription)}>
						{props.item.description || t`No description`}
					</p>
				</div>

				<div {...stylex.attrs(styles.collectionMetadata)}>
					<span {...stylex.attrs(styles.itemCount)}>
						{props.item.item_count}{" "}
						{props.item.item_count === 1 ? t`item` : t`items`}
					</span>
					<span {...stylex.attrs(styles.collectionArrow)}>&gt;</span>
				</div>
			</Link>
		</li>
	)
}

function roleColor(role: UserRoleEnum): AppColor {
	switch (role) {
		case "Admin": {
			return "Reimu"
		}
		case "Moderator": {
			return "Blue"
		}
		case "User": {
			return "Slate"
		}
		default: {
			return "Slate"
		}
	}
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
	month: "short",
	day: "numeric",
	year: "numeric",
})

function formatDateTime(value: string) {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return DATE_FORMATTER.format(date)
}
