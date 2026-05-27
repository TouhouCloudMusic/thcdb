import { Tabs } from "@kobalte/core/tabs"
import { useLingui } from "@lingui/solid/macro"
import type { UserProfile, UserRoleEnum } from "@thc/api"
import type { ComponentProps } from "solid-js"
import { createMemo, createSignal, For, Match, Show, Switch } from "solid-js"
import { twMerge } from "tailwind-merge"

import type { AppColor } from "~/component"
import { Badge } from "~/component/atomic/Badge"
import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"
import { Markdown } from "~/component/markdown"
import { USER_ROLE_NAMES } from "~/domain/user/constants"
import type { UserCollection } from "~/hey-api"
import { PageLayout } from "~/layout/PageLayout"
import { imgUrl } from "~/utils/adapter/static_file"
import { CollectionFormDialog } from "~/view/collection/CollectionFormDialog"
import { CollectionLoadMore } from "~/view/collection/CollectionLoadMore"
import type { CollectionToolbarSelectOption } from "~/view/collection/CollectionToolbarSelect"
import {
	COLLECTION_TOOL_INPUT_CLASS,
	CollectionToolbarSelect,
} from "~/view/collection/CollectionToolbarSelect"
import { FollowedCollectionRow } from "~/view/collection/FollowedCollectionRow"

type ProfileTabValue = "collections" | "activity"
type ProfileTabState = {
	value: ProfileTabValue
	onChange: (value: ProfileTabValue) => void
}

type Props = {
	data: UserProfile
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
		const roles = props.data.roles ?? []
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
		<PageLayout class="min-h-full bg-primary font-sans pb-12">
			{/* Simple banner without styling tricks */}
			<div class="w-full h-32 sm:h-48 lg:h-64 bg-secondary border-b border-slate-200">
				<Show
					when={bannerUrl()}
					fallback={<div class="size-full bg-slate-50"></div>}
				>
					{(src) => (
						<img
							src={src()}
							alt={t`Profile banner`}
							class="size-full object-cover object-center"
						/>
					)}
				</Show>
			</div>

			<div class="mx-auto max-w-[1200px] px-6 sm:px-8 lg:px-12 flex flex-col lg:flex-row gap-12 lg:gap-16 pt-6 lg:pt-0">
				{/* Standard left sidebar */}
				<aside class="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col">
					<div class="lg:-mt-24 sm:-mt-16 mb-5">
						<Avatar
							user={props.data}
							class="size-32 sm:size-40 rounded-full border-4 border-white bg-white ring-1 ring-slate-200"
						/>
					</div>

					<h1 class="text-2xl text-primary leading-tight">{props.data.name}</h1>

					<div class="mt-2 flex flex-wrap items-center gap-2">
						<Show when={topRole()}>
							{(role) => <RoleBadge role={role()} />}
						</Show>
					</div>

					<Show when={props.isCurrentUser || props.action !== undefined}>
						<div class="mt-6 w-full max-w-[240px] lg:max-w-none">
							<ProfileActionButton
								userType={userType()}
								pendingAction={props.action?.pendingAction}
								errorMessage={props.action?.errorMessage}
								onFollow={props.action?.onFollow}
								onUnfollow={props.action?.onUnfollow}
							/>
						</div>
					</Show>

					<div class="mt-8 text-sm text-secondary">
						<AboutSection user={props.data} />
					</div>

					<div class="mt-8 pt-6 border-t border-slate-100">
						<MetricsSection metrics={metrics()} />
					</div>
				</aside>

				{/* Main content */}
				<main class="flex-1 min-w-0 flex flex-col gap-14 lg:mt-8">
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
} & ComponentProps<typeof Button>

type ProfileActionProps = Pick<
	ProfileActionButtonProps,
	"pendingAction" | "errorMessage" | "onFollow" | "onUnfollow"
>

const BUTTON_CLASS = "w-full justify-center text-sm px-4 py-2"

function ProfileActionButton(props: ProfileActionButtonProps) {
	const { t } = useLingui()
	const [hovering, setHovering] = createSignal(false)

	const onMouseEnter = () => setHovering(true)
	const onMouseLeave = () => setHovering(false)

	return (
		<div class="flex flex-col gap-2">
			<Switch>
				<Match when={props.userType === UserType.Current}>
					<Link
						to="/profile/edit"
						class="block no-underline hover:no-underline w-full outline-none"
					>
						<Button
							variant="SecondaryV2"
							color="Gray"
							class={BUTTON_CLASS}
						>
							Edit Profile
						</Button>
					</Link>
				</Match>

				<Match when={props.userType === UserType.Unfollowed}>
					<Button
						variant="SecondaryV2"
						color="Slate"
						class={BUTTON_CLASS}
						disabled={props.pendingAction !== undefined}
						onClick={props.onFollow}
					>
						{props.pendingAction === "follow" ? t`Following...` : t`Follow`}
					</Button>
				</Match>

				<Match when={props.userType === UserType.Following}>
					<Button
						variant="SecondaryV2"
						color="Slate"
						class={BUTTON_CLASS}
						disabled={props.pendingAction !== undefined}
						onMouseEnter={onMouseEnter}
						onMouseLeave={onMouseLeave}
						onClick={props.onUnfollow}
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
				<div class="text-sm text-red-600">{props.errorMessage}</div>
			</Show>
		</div>
	)
}

function AboutSection(props: { user: UserProfile }) {
	const { t } = useLingui()
	const [mdParsing, setMdParsing] = createSignal(true)
	const bio = createMemo(() => props.user.bio)
	const shouldPulse = createMemo(() => Boolean(bio()) && mdParsing())
	const onRendered = () => setMdParsing(false)

	return (
		<div class="flex flex-col gap-3">
			<h2 class="text-sm text-primary tracking-wide">{t`About`}</h2>
			<div
				class={twMerge(
					"prose prose-slate prose-sm leading-relaxed max-w-none text-secondary",
					shouldPulse() && "animate-pulse opacity-50",
				)}
			>
				<Show
					when={bio()}
					fallback={
						<span class="text-slate-500 text-sm">
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
		<div class="flex flex-col gap-3">
			<For each={props.metrics}>
				{(metric) => (
					<div class="flex items-center justify-between">
						<span class="text-sm text-slate-600">{metric.label}</span>
						<span class="text-base text-primary tabular-nums">
							{metric.value}
						</span>
					</div>
				)}
			</For>
		</div>
	)
}

function PinsSection(props: { items: readonly PinItem[] }) {
	return (
		<section class="flex flex-col gap-5">
			<h2 class="text-lg text-primary pb-2 border-b border-slate-100">
				Highlights
			</h2>

			<div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
			class="group flex flex-col h-full bg-primary border border-slate-200 rounded-md transition-colors hover:border-slate-300 no-underline outline-none overflow-hidden"
		>
			<Show when={props.item.coverUrl}>
				{(src) => (
					<div class="aspect-video w-full overflow-hidden bg-slate-50 border-b border-slate-100">
						<img
							src={src()}
							alt=""
							loading="lazy"
							class="size-full object-cover transition-opacity duration-300 group-hover:opacity-90"
						/>
					</div>
				)}
			</Show>

			<Show when={!props.item.coverUrl}>
				<div class="aspect-video w-full overflow-hidden bg-slate-50 border-b border-slate-100 flex items-center justify-center">
					<span class="text-slate-400 text-xs font-medium tracking-wide">
						{props.item.kind}
					</span>
				</div>
			</Show>

			<div class="flex flex-col flex-1 p-4">
				<div class="flex items-center mb-1">
					<span class="text-xs font-medium text-slate-500">
						{props.item.kind}
					</span>
				</div>
				<h3 class="text-base leading-tight text-primary group-hover:text-blue-600 transition-colors line-clamp-2 mb-1">
					{props.item.title}
				</h3>
				<p class="text-sm text-slate-500 line-clamp-2 mt-auto">
					{props.item.subtitle}
				</p>
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
			<Tabs
				defaultValue={props.defaultValue}
				value={props.tab?.value}
				onChange={props.tab === undefined ? undefined : onTabChange}
				class="flex flex-col gap-5"
			>
				<Tabs.List class="relative grid w-full grid-cols-2 rounded-xl bg-secondary p-1 ring-1 ring-slate-200 sm:w-[320px]">
					<For each={PROFILE_TAB_ITEMS}>
						{(item) => (
							<Tabs.Trigger
								as="button"
								value={item.value}
								class="relative z-10 flex min-w-0 items-center justify-center rounded-lg px-4 py-2.5 text-sm text-tertiary outline-none transition-colors duration-150 hover:text-primary focus-visible:outline focus-visible:outline-reimu-600 data-selected:text-primary"
							>
								<ProfileTabLabel value={item.value} />
							</Tabs.Trigger>
						)}
					</For>
					<Tabs.Indicator class="absolute inset-y-1 rounded-lg bg-primary shadow-xs ring-1 ring-slate-200 transition-all duration-200" />
				</Tabs.List>

				<Tabs.Content
					value="activity"
					class="outline-none"
				>
					<ActivityPanel items={props.activity} />
				</Tabs.Content>

				<Tabs.Content
					value="collections"
					class="outline-none"
				>
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
				</Tabs.Content>
			</Tabs>
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
	return (
		<div class="border border-slate-200 rounded-md bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
			{props.message}
		</div>
	)
}

function ActivityRow(props: { item: ActivityItem; isLast: boolean }) {
	return (
		<div
			class={twMerge(
				"flex flex-col sm:flex-row gap-2 sm:gap-4 py-4",
				props.isLast ? "" : "border-b border-slate-100",
			)}
		>
			<div class="w-32 shrink-0 text-sm text-slate-500 sm:pt-0.5">
				{formatDateTime(props.item.at)}
			</div>

			<div class="flex-1 min-w-0">
				<div class="text-[15px] text-primary leading-snug">
					<span class="text-slate-500 mr-2">{props.item.action}</span>
					<ActivityEntity item={props.item} />
				</div>

				<Show when={props.item.detail}>
					<div class="text-sm text-slate-500 mt-1 truncate">
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
			fallback={<span class="text-primary">{props.item.entity}</span>}
		>
			{(l) => (
				<Link
					to={l().to}
					params={l().params}
					class="text-primary hover:underline transition-colors"
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
				class="rounded-md border border-slate-200 bg-primary shadow-xs shadow-slate-950/5 px-2 py-0.5 text-xs font-medium"
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
	const collectionTypeOptions =
		(): CollectionToolbarSelectOption<CollectionType>[] => [
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
		(): CollectionToolbarSelectOption<CollectionVisibilityFilter>[] =>
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
	const sortOptions =
		(): CollectionToolbarSelectOption<CollectionSortValue>[] =>
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

	const visibleItems = createMemo(() => {
		const keyword = searchQuery().trim().toLocaleLowerCase()
		const visibility = visibilityFilter()
		const sort = sortValue()
		const type = collectionType()

		const sourceItems =
			type === "own"
				? props.items
				: (props.followedItems?.map((item) => item.collection) ?? [])

		const items = sourceItems
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
		if (collectionType() === "own") {
			if (props.items.length > 0) return t`No collections match your filters`
			if (props.isCurrentUser) return t`You haven't created any collections yet`
		} else {
			if ((props.followedItems?.length ?? 0) > 0)
				return t`No collections match your filters`
			return t`You haven't followed any collections yet`
		}
		return t`No collections found`
	})

	return (
		<div class="flex flex-col gap-5">
			<div class="flex flex-col gap-3 border-b border-slate-200 pb-4 xl:flex-row xl:items-center xl:justify-between">
				<div class="flex flex-col gap-2 flex-1 min-w-0 sm:flex-row sm:items-center">
					<input
						type="search"
						value={searchQuery()}
						placeholder={t`Search collections`}
						aria-label={t`Search collections`}
						onInput={(e) => setSearchQuery(e.currentTarget.value)}
						class={twMerge(
							COLLECTION_TOOL_INPUT_CLASS,
							"w-full flex-1 min-w-[200px]",
						)}
					/>

					<Show when={props.isCurrentUser}>
						<CollectionToolbarSelect
							options={collectionTypeOptions()}
							value={collectionType()}
							placeholder={t`Type`}
							ariaLabel={t`Collection type`}
							onChange={setCollectionType}
							class="w-full sm:w-auto"
						/>
					</Show>

					<CollectionToolbarSelect
						options={visibilityOptions()}
						value={visibilityFilter()}
						placeholder={t`Visibility`}
						ariaLabel={t`Filter collections`}
						onChange={setVisibilityFilter}
						class="w-full sm:w-auto"
					/>

					<CollectionToolbarSelect
						options={sortOptions()}
						value={sortValue()}
						placeholder={t`Sort`}
						ariaLabel={t`Sort collections`}
						onChange={setSortValue}
						class="w-full sm:w-auto"
					/>

					<Show when={props.isCurrentUser}>
						<Button
							variant="SecondaryV2"
							color="Slate"
							size="Sm"
							class="h-9 px-3"
							onClick={() => setCollectionFormOpen(true)}
						>
							{t`New collection`}
						</Button>
					</Show>
				</div>
			</div>

			<Show
				when={visibleItems().length > 0}
				fallback={<SectionEmptyState message={emptyMessage()} />}
			>
				<ul class="divide-y divide-slate-100 border-y border-slate-200">
					<For each={visibleItems()}>
						{(item) => (
							<Show
								when={collectionType() === "followed"}
								fallback={<CollectionRow item={item} />}
							>
								<FollowedCollectionRow item={item} />
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
			<div class="flex flex-col">
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
		<li>
			<Link
				to="/collection/$id"
				params={{ id: props.item.id.toString() }}
				underline={false}
				class="group grid gap-3 px-1 py-4 no-underline outline-none transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3"
			>
				<div class="min-w-0">
					<div class="flex min-w-0 items-baseline gap-2">
						<h3 class="truncate text-[15px] font-medium text-slate-900 transition-colors group-hover:text-sky-700">
							{props.item.name}
						</h3>
						<span class="text-xs text-tertiary">
							{props.item.is_public ? t`Public` : t`Private`}
						</span>
					</div>
					<p class="mt-1 line-clamp-1 text-sm text-slate-500">
						{props.item.description || t`No description`}
					</p>
				</div>

				<div class="flex items-center gap-4 text-xs text-slate-500 sm:justify-end">
					<span class="tabular-nums">
						{props.item.item_count}{" "}
						{props.item.item_count === 1 ? t`item` : t`items`}
					</span>
					<span class="text-slate-300 transition-colors group-hover:text-slate-500">
						&gt;
					</span>
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
