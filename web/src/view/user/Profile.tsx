import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { UserProfile, UserRoleEnum } from "@thc/api"
import { BookmarkIcon, MixerHorizontalIcon, PlusIcon } from "@thc/icons/radix"
import {
	batch,
	createMemo,
	createSignal,
	For,
	Match,
	Show,
	Switch,
} from "solid-js"

import type { AppColor } from "~/component"
import { Badge } from "~/component/atomic/Badge"
import { Tab } from "~/component/atomic/Tab"
import { Avatar } from "~/component/atomic/avatar"
import {
	Button,
	buttonSizeStyles,
	buttonStyles,
} from "~/component/atomic/button"
import { controlLayoutVars } from "~/component/atomic/controlSpacing.stylex"
import { ToolbarSearch } from "~/component/atomic/form/ToolbarSearch"
import type { ToolbarSelectOption } from "~/component/atomic/form/ToolbarSelect"
import { ToolbarSelect } from "~/component/atomic/form/ToolbarSelect"
import { Dialog } from "~/component/dialog"
import { Markdown } from "~/component/markdown"
import { USER_ROLE_NAMES } from "~/domain/user/constants"
import type { UserCollection } from "~/hey-api"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	colors,
	controlHeights,
	fonts,
	lineHeights,
	fontSizes,
	px,
	radius,
} from "~/style/tokens.stylex"
import * as typography from "~/style/typography"
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
		display: "grid",
		rowGap: px[32],
		paddingInline: {
			default: px[24],
			"@media (min-width: 40rem)": px[32],
			"@media (min-width: 64rem)": px[48],
		},
	},
	header: {
		display: "grid",
		gridTemplateColumns: {
			default: `${px[96]} minmax(0, 1fr) auto`,
			"@media (min-width: 44rem)": `${px[128]} 1px fit-content(45%) minmax(0, 1fr) auto`,
		},
		gridTemplateAreas: {
			default:
				'"avatar . ." "name name action" "roles roles roles" "stats stats stats" "bio bio bio"',
			"@media (min-width: 23rem)":
				'"avatar name action" "avatar roles roles" "stats stats stats" "bio bio bio"',
			"@media (min-width: 44rem)":
				'"avatar . name roles action" "stats . bio bio bio"',
		},
		gridTemplateRows: {
			default: "auto",
			"@media (min-width: 44rem)": "minmax(3rem, auto) auto",
		},
		columnGap: { default: px[12], "@media (min-width: 44rem)": px[16] },
		rowGap: { default: px[4], "@media (min-width: 44rem)": px[20] },
		alignItems: "start",
		paddingBlockStart: { default: px[12], "@media (min-width: 44rem)": px[16] },
	},
	avatarPosition: {
		gridArea: "avatar",
		marginBlockStart: {
			default: "-3.75rem",
			"@media (min-width: 44rem)": "-5rem",
		},
	},
	avatar: {
		width: { default: px[96], "@media (min-width: 44rem)": px[128] },
		height: { default: px[96], "@media (min-width: 44rem)": px[128] },
		borderRadius: radius.full,
		borderWidth: { default: "3px", "@media (min-width: 44rem)": "4px" },
		borderStyle: "solid",
		borderColor: palette.white,
		backgroundColor: palette.white,
		boxShadow: `0 0 0 1px ${palette.slate[200]}`,
	},
	name: {
		gridArea: "name",
		alignSelf: "center",
		fontSize: "clamp(1.125rem, 5cqw, 1.875rem)",
		lineHeight: 1.2,
		overflowWrap: "anywhere",
	},
	roles: {
		gridArea: "roles",
		alignSelf: "center",
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[8],
	},
	actions: {
		gridArea: "action",
		alignSelf: "center",
		justifySelf: "end",
	},
	biography: {
		gridArea: "bio",
		minWidth: 0,
		maxWidth: "68ch",
		marginBlockStart: { default: px[12], "@media (min-width: 44rem)": 0 },
		overflowWrap: "anywhere",
	},
	metrics: {
		gridArea: "stats",
		minWidth: 0,
		alignSelf: "stretch",
		marginBlockStart: { default: px[12], "@media (min-width: 44rem)": 0 },
	},
	metricsDivider: {
		display: { default: "none", "@media (min-width: 44rem)": "block" },
		gridColumn: 2,
		gridRow: 2,
		alignSelf: "stretch",
		backgroundColor: palette.slate[300],
	},
	main: {
		display: "flex",
		minWidth: 0,
		flexDirection: "column",
		gap: px[32],
	},
	actionList: { display: "flex", flexDirection: "column", gap: px[8] },
	actionError: { fontSize: fontSizes.sm, lineHeight: "1.25rem" },
	emptyBio: {
		color: palette.slate[500],
		fontSize: fontSizes.sm,
		lineHeight: "1.25rem",
	},
	metricList: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(auto-fit, minmax(min(5.5rem, 100%), 1fr))",
			"@media (min-width: 44rem)": "repeat(2, minmax(0, 1fr))",
		},
		rowGap: px[8],
		paddingBlock: { default: px[16], "@media (min-width: 44rem)": 0 },
		borderBlockWidth: { default: "1px", "@media (min-width: 44rem)": 0 },
		borderStyle: "solid",
		borderColor: palette.slate[300],
	},
	metric: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		textAlign: "center",
		overflowWrap: "anywhere",
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
	tab: {
		width: "100%",
	},
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
		backgroundColor: "color-mix(in oklab, currentColor 9%, transparent)",
		boxShadow: "none",
		paddingBlock: px[2],
		fontWeight: 500,
	},
	collections: { display: "flex", flexDirection: "column", gap: px[20] },
	toolbar: { display: "flex", alignItems: "center", gap: px[8] },
	desktopFilters: {
		display: { default: "none", "@media (min-width: 44rem)": "flex" },
		alignItems: "center",
		gap: px[8],
		flexShrink: 0,
	},
	mobileOnly: {
		display: { default: null, "@media (min-width: 44rem)": "none" },
	},
	toolbarAction: { flexShrink: 0 },
	toolbarIcon: { width: px[16], height: px[16] },
	filterDialog: {
		top: "auto",
		bottom: 0,
		left: 0,
		width: "100%",
		maxWidth: "none",
		translate: "0 0",
		maxHeight: "min(80dvh, 32rem)",
		overflowY: "auto",
		paddingInline: px[24],
		paddingTop: px[24],
		paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
	},
	filterFields: { display: "grid", gap: px[16], marginTop: px[8] },
	filterLabel: {
		marginBottom: px[6],
		color: colors.textSecondary,
		fontSize: fontSizes.sm,
	},
	filterActions: {
		display: "flex",
		justifyContent: "flex-end",
		gap: px[8],
		marginTop: px[24],
	},
	filterSummary: { display: "flex", alignItems: "center", gap: px[4] },
	collectionList: {
		borderBlockWidth: "1px",
		borderBlockStyle: "solid",
		borderColor: palette.slate[200],
	},
	activityList: { display: "flex", flexDirection: "column" },
	collection: {
		display: "block",
		fontFamily: fonts.sans,
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 400,
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
	},
	collectionHeading: {
		display: "flex",
		minWidth: "0rem",
		alignItems: "baseline",
		gap: px[8],
	},
	collectionName: {
		minWidth: 0,
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		fontSize: "inherit",
		fontWeight: "inherit",
		lineHeight: "inherit",
		color: palette.slate[900],
		transitionProperty:
			"color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
		transitionDuration: "150ms",
		transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
	},
	visibility: {
		flexShrink: 0,
		color: colors.textTertiary,
	},
	collectionDescription: {
		marginTop: px[4],
		overflow: "hidden",
		display: "-webkit-box",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: 1,
		color: palette.slate[500],
	},
	itemCount: {
		flexShrink: 0,
		whiteSpace: "nowrap",
		fontVariantNumeric: "tabular-nums",
		color: palette.slate[500],
	},
})

const profileStyles = stylex.create({
	collectionRow: {
		borderBottomWidth: { default: "1px", ":last-child": 0 },
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[100],
	},
	action: { minWidth: "6rem", justifyContent: "center" },
	editActionHeight: { [controlLayoutVars.targetHeight]: controlHeights.md },
	bio: { lineHeight: 1.625, maxWidth: "none", color: colors.textPrimary },
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
		display: "grid",
		gridTemplateColumns: "repeat(2, minmax(0, 6.25rem))",
		/* Work around Firefox subpixel snapping differences
		   between the list border and transformed indicator.
		   See https://bugzilla.mozilla.org/show_bug.cgi?id=1852291 */
		transform: "translateY(0px)",
	},
	search: { minWidth: 0, flex: "1 1 0%" },
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

	const bannerUrl = createMemo(() => imgUrl(props.data.banner_url, 11))
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
				<aside {...stylex.attrs(styles.header)}>
					<div {...stylex.attrs(styles.avatarPosition)}>
						<Avatar
							user={props.data}
							thumbnailSize={9}
							styles={styles.avatar}
						/>
					</div>

					<h1 {...stylex.attrs(typography.heading.lg, styles.name)}>
						{props.data.name}
					</h1>

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

					<div {...stylex.attrs(styles.metrics)}>
						<MetricsSection metrics={metrics()} />
					</div>

					<div
						{...stylex.attrs(styles.metricsDivider)}
						aria-hidden="true"
					></div>

					<div {...stylex.attrs(styles.biography)}>
						<AboutSection user={props.data} />
					</div>
				</aside>

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
						{...stylex.attrs(
							link.base,
							buttonStyles.base,
							buttonStyles.outline,
							buttonStyles.slate,
							buttonSizeStyles.sm,
							profileStyles.editActionHeight,
							profileStyles.action,
						)}
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
						size="sm"
						targetHeight={controlHeights.md}
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
						size="sm"
						targetHeight={controlHeights.md}
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
				stylex.attrs(
					link.base,
					link.withUnderline,
					stylex.defaultMarker(),
					styles.pin,
				).class
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
				{...stylex.attrs(styles.tabs)}
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
					class={
						stylex.attrs(link.base, link.withUnderline, styles.activityLink)
							.class
					}
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

function collectionFilterLabels<T extends string>(
	options: ToolbarSelectOption<T>[],
) {
	return options.map((option) => ({ ...option, label: option.itemLabel }))
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
	const [draftType, setDraftType] = createSignal<CollectionType>("own")
	const [draftVisibility, setDraftVisibility] =
		createSignal<CollectionVisibilityFilter>("all")
	const [draftSort, setDraftSort] = createSignal<CollectionSortValue>("newest")
	const [filtersOpen, setFiltersOpen] = createSignal(false)
	const canFilterVisibility = () =>
		props.isCurrentUser && collectionType() === "own"

	const onFiltersOpenChange = (open: boolean) => {
		batch(() => {
			if (open) {
				setDraftType(collectionType())
				setDraftVisibility(visibilityFilter())
				setDraftSort(sortValue())
			}
			setFiltersOpen(open)
		})
	}
	const applyFilters = () => {
		batch(() => {
			setCollectionType(draftType())
			setVisibilityFilter(draftVisibility())
			setSortValue(draftSort())
			setFiltersOpen(false)
		})
	}
	const changeCollectionType = (type: CollectionType) => {
		batch(() => {
			setCollectionType(type)
			setVisibilityFilter("all")
			setSortValue("newest")
		})
	}
	const changeDraftType = (type: CollectionType) => {
		batch(() => {
			setDraftType(type)
			setDraftVisibility("all")
			setDraftSort("newest")
		})
	}
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
	const sortOptions = (
		type: CollectionType,
	): ToolbarSelectOption<CollectionSortValue>[] =>
		COLLECTION_SORT_OPTIONS.map((option) => {
			switch (option.value) {
				case "newest": {
					if (type === "followed") {
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
				if (!props.isCurrentUser) return item.is_public
				if (!canFilterVisibility()) return true
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
			<Dialog.Root
				open={filtersOpen()}
				onOpenChange={onFiltersOpenChange}
			>
				<div {...stylex.attrs(styles.toolbar)}>
					<ToolbarSearch
						value={searchQuery()}
						placeholder={t`Search`}
						ariaLabel={t`Search collections`}
						onInput={setSearchQuery}
						styles={profileStyles.search}
					/>

					<div {...stylex.attrs(styles.desktopFilters)}>
						<Show when={props.isCurrentUser}>
							<ToolbarSelect
								options={collectionTypeOptions()}
								value={collectionType()}
								placeholder={t`Type`}
								ariaLabel={t`Collection type`}
								onChange={changeCollectionType}
							/>
						</Show>

						<Show when={canFilterVisibility()}>
							<ToolbarSelect
								options={visibilityOptions()}
								value={visibilityFilter()}
								placeholder={t`Visibility`}
								ariaLabel={t`Filter collections by visibility`}
								onChange={setVisibilityFilter}
							/>
						</Show>

						<ToolbarSelect
							options={sortOptions(collectionType())}
							value={sortValue()}
							placeholder={t`Sort`}
							ariaLabel={t`Sort collections`}
							onChange={setSortValue}
						/>
					</div>

					<Show when={canFilterVisibility()}>
						<Button
							aria-label={t`New collection`}
							title={t`New collection`}
							aria-haspopup="dialog"
							onClick={() => setCollectionFormOpen(true)}
							appearance="ghost"
							tone="slate"
							size="sm"
							targetHeight={controlHeights.md}
							styles={styles.toolbarAction}
						>
							<Button.Icon>
								<PlusIcon
									aria-hidden="true"
									{...stylex.attrs(styles.toolbarIcon)}
								/>
							</Button.Icon>
						</Button>
					</Show>

					<Dialog.Trigger
						as={Button}
						aria-label={t`Filters`}
						title={t`Filters`}
						appearance="ghost"
						tone="slate"
						size="sm"
						targetHeight={controlHeights.md}
						styles={[styles.toolbarAction, styles.mobileOnly]}
					>
						<Button.Icon>
							<MixerHorizontalIcon
								aria-hidden="true"
								{...stylex.attrs(styles.toolbarIcon)}
							/>
						</Button.Icon>
					</Dialog.Trigger>
				</div>

				<Dialog.Portal>
					<Dialog.Overlay data-blur />
					<Dialog.Content styles={styles.filterDialog}>
						<Dialog.Title
							styles={typography.heading.md}
						>{t`Filters`}</Dialog.Title>

						<div {...stylex.attrs(styles.filterFields)}>
							<Show when={props.isCurrentUser}>
								<div>
									<p {...stylex.attrs(styles.filterLabel)}>{t`Source`}</p>
									<ToolbarSelect
										options={[
											{
												value: "own",
												label: t`Created by me`,
												itemLabel: t`Created by me`,
											},
											{
												value: "followed",
												label: t`Followed`,
												itemLabel: t`Followed`,
											},
										]}
										value={draftType()}
										placeholder={t`Source`}
										ariaLabel={t`Collection source`}
										onChange={changeDraftType}
									/>
								</div>
							</Show>

							<Show when={props.isCurrentUser && draftType() === "own"}>
								<div>
									<p {...stylex.attrs(styles.filterLabel)}>{t`Visibility`}</p>
									<ToolbarSelect
										options={collectionFilterLabels(visibilityOptions())}
										value={draftVisibility()}
										placeholder={t`Visibility`}
										ariaLabel={t`Filter collections by visibility`}
										onChange={setDraftVisibility}
									/>
								</div>
							</Show>

							<div>
								<p {...stylex.attrs(styles.filterLabel)}>{t`Sort`}</p>
								<ToolbarSelect
									options={collectionFilterLabels(sortOptions(draftType()))}
									value={draftSort()}
									placeholder={t`Sort`}
									ariaLabel={t`Sort collections`}
									onChange={setDraftSort}
								/>
							</div>
						</div>

						<div {...stylex.attrs(styles.filterActions)}>
							<Dialog.CloseButton
								aria-label={t`Cancel`}
								appearance="soft"
								tone="gray"
								size="sm"
							>
								{t`Cancel`}
							</Dialog.CloseButton>
							<Button
								appearance="solid"
								tone="gray"
								size="sm"
								onClick={applyFilters}
							>
								{t`Apply`}
							</Button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>

			<Show when={collectionType() === "followed"}>
				<Badge
					color="Slate"
					styles={styles.filterSummary}
				>
					<BookmarkIcon
						aria-hidden="true"
						{...stylex.attrs(styles.toolbarIcon)}
					/>
					{t`Followed`}
				</Badge>
			</Show>

			<Show when={canFilterVisibility() && visibilityFilter() !== "all"}>
				<Badge
					color="Slate"
					styles={styles.filterSummary}
				>
					{visibilityFilter() === "public" ? t`Public` : t`Private`}
					<Button
						appearance="ghost"
						tone="gray"
						size="xs"
						aria-label={t`Clear visibility filter`}
						onClick={() => setVisibilityFilter("all")}
					>
						×
					</Button>
				</Badge>
			</Show>

			<Show
				when={visibleItems().length > 0}
				fallback={<SectionEmptyState message={emptyMessage()} />}
			>
				<ul {...stylex.attrs(styles.collectionList)}>
					<For each={visibleItems()}>
						{(item) => (
							<Show
								when={collectionType() === "followed"}
								fallback={
									<CollectionRow
										item={item}
										showVisibility={props.isCurrentUser}
									/>
								}
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

export function CollectionRow(props: {
	item: UserCollection
	showVisibility: boolean
}) {
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
				<div {...stylex.attrs(styles.collectionHeading)}>
					<h3 {...stylex.attrs(styles.collectionName)}>{props.item.name}</h3>
					<Show when={props.showVisibility}>
						<span {...stylex.attrs(styles.visibility)}>
							{props.item.is_public ? t`Public` : t`Private`}
						</span>
					</Show>
					<span {...stylex.attrs(styles.itemCount)}>
						{props.item.item_count}{" "}
						{props.item.item_count === 1 ? t`item` : t`items`}
					</span>
				</div>
				<p {...stylex.attrs(styles.collectionDescription)}>
					{props.item.description || t`No description`}
				</p>
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
