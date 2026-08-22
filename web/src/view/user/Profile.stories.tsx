import type { UserProfile, UserProfileStats } from "@thc/api"
import { createMemo, createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import baka from "~/component/atomic/avatar/baka.jpg"
import type { UserCollection } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import type { ActivityItem, PinItem, ProfileData } from "./Profile"
import { Profile } from "./Profile"

const ORIGIN = globalThis.location.origin

type ProfileScenario =
	| "owner"
	| "visitor-following"
	| "visitor-unfollowed"
	| "empty"

type StatsPreset = "default" | "zero"
type FeedPreset = "none" | "few" | "many"

type StoryRootProps = {
	scenario: ProfileScenario
	isSignedIn: boolean
	hasBanner: boolean
	hasBio: boolean
	hasRoles: boolean
	statsPreset: StatsPreset
	highlightsPreset: FeedPreset
	activityPreset: FeedPreset
}

const EXTRA_HIGHLIGHTS: readonly PinItem[] = [
	{
		accent: "Reimu",
		kind: "Release",
		title: "Touhou Cloud Essentials",
		subtitle: "Compilation · 24 tracks · mock cover art",
		coverUrl: "/img/cover/release/1.png",
		to: { to: "/release/$id", params: { id: "1" } },
	},
	{
		accent: "Blue",
		kind: "Song",
		title: "U.N. Owen was her? (arrange)",
		subtitle: "Credit map · vocalist aliases · role normalization",
		to: { to: "/song/$id", params: { id: "9" } },
	},
	{
		accent: "Slate",
		kind: "Tag",
		title: "Trance",
		subtitle: "Genre tag · weighted votes · related sub-tags",
		to: { to: "/tag/$id", params: { id: "3" } },
	},
	{
		accent: "Green",
		kind: "Artist",
		title: "FELT",
		subtitle: "Circle profile · releases · vocalist credits",
		to: { to: "/artist/$id", params: { id: "12" } },
	},
	{
		accent: "Blue",
		kind: "Release",
		title: "Midnight Shrine Broadcast",
		subtitle: "Live cut · remaster notes · alt sleeve",
		coverUrl: "/img/cover/release/1.png",
		to: { to: "/release/$id", params: { id: "42" } },
	},
	{
		accent: "Green",
		kind: "Artist",
		title: "ShibayanRecords",
		subtitle: "Discography cleanup · alias map · event links",
		to: { to: "/artist/$id", params: { id: "52" } },
	},
] satisfies readonly [PinItem, ...PinItem[]]

const EXTRA_ACTIVITY: readonly ActivityItem[] = [
	{
		at: "2025-12-28T10:42:00.000Z",
		accent: "Reimu",
		action: "Added release",
		entity: "東方紅魔郷 Arrange Notes — Winter Press",
		detail: "linked artists · set event · added catalog no.",
		link: { to: "/release/$id", params: { id: "101" } },
	},
	{
		at: "2025-12-27T23:05:00.000Z",
		accent: "Blue",
		action: "Corrected credit",
		entity: "U.N. Owen was her? (arrange)",
		detail: "vocalist alias merged · role normalized",
		link: { to: "/song/$id", params: { id: "9" } },
	},
	{
		at: "2025-12-27T09:14:00.000Z",
		accent: "Slate",
		action: "Tagged song",
		entity: "少女さとり ～ 3rd eye",
		detail: "genre=Orchestral · theme=Horror · instrument=Piano",
		link: { to: "/song/$id", params: { id: "12" } },
	},
	{
		at: "2025-12-26T16:22:00.000Z",
		accent: "Green",
		action: "Created tag",
		entity: "Live recording",
		detail: "type=Recording · used by 6 releases",
		link: { to: "/tag/$id", params: { id: "21" } },
	},
	{
		at: "2025-12-24T11:12:00.000Z",
		accent: "Blue",
		action: "Updated release notes",
		entity: "Dream Layer EP",
		detail: "localized title · release date precision",
		link: { to: "/release/$id", params: { id: "103" } },
	},
	{
		at: "2025-12-23T05:18:00.000Z",
		accent: "Slate",
		action: "Re-linked artist",
		entity: "SOUND HOLIC",
		detail: "merged duplicate profile · preserved aliases",
		link: { to: "/artist/$id", params: { id: "18" } },
	},
] satisfies readonly [ActivityItem, ...ActivityItem[]]

const DEFAULT_ARGS: StoryRootProps = {
	scenario: "owner",
	isSignedIn: true,
	hasBanner: true,
	hasBio: true,
	hasRoles: true,
	statsPreset: "default",
	highlightsPreset: "many",
	activityPreset: "many",
}

const OWNER = {
	id: 1,
	name: "Hakurei Reimu",
}

const OWN_COLLECTIONS: readonly UserCollection[] = [
	{
		id: 101,
		owner: OWNER,
		name: "Touhou essentials",
		description: "Core releases, songs, and circles for quick checks.",
		is_public: true,
		item_count: 24,
		follower_count: 8,
		is_following: null,
	},
	{
		id: 102,
		owner: OWNER,
		name: "Private cleanup queue",
		description: "Draft links and items that still need review.",
		is_public: false,
		item_count: 7,
		follower_count: 0,
		is_following: null,
	},
	{
		id: 103,
		owner: OWNER,
		name: "Vocal arrangement notes",
		description: "Songs with vocalist aliases and role normalization notes.",
		is_public: true,
		item_count: 16,
		follower_count: 5,
		is_following: null,
	},
]

const FOLLOWED_COLLECTIONS = [
	{
		followed_at: "2026-05-20T12:00:00.000Z",
		collection: {
			id: 201,
			owner: {
				id: 2,
				name: "Kirisame Marisa",
			},
			name: "Arrangement references",
			description: "Public collections followed from another profile.",
			is_public: true,
			item_count: 31,
			follower_count: 12,
			is_following: true,
			followed_at: "2026-05-20T12:00:00.000Z",
		},
	},
	{
		followed_at: "2026-05-18T09:20:00.000Z",
		collection: {
			id: 202,
			owner: {
				id: 3,
				name: "Patchouli Knowledge",
			},
			name: "Library listening shelf",
			description: "Release and song references for metadata passes.",
			is_public: true,
			item_count: 14,
			follower_count: 4,
			is_following: true,
			followed_at: "2026-05-18T09:20:00.000Z",
		},
	},
] satisfies readonly {
	followed_at: string
	collection: UserCollection
}[]

function assetUrl(path: string) {
	return new URL(path, ORIGIN).href
}

function createOwnerProfile(): UserProfile {
	return {
		id: 1,
		name: "Hakurei Reimu",
		last_login: "2026-03-28T09:30:00.000Z",
		avatar_url: assetUrl(baka),
		banner_url: assetUrl("/img/cover/release/1.png"),
		roles: [
			{
				id: 1,
				name: "Admin",
			},
			{
				id: 2,
				name: "Moderator",
			},
		],
		bio: [
			"负责整理社团、专辑和曲目之间的链接。",
			"",
			"- 重点处理条目关联",
			"- 也会补充说明文本",
		].join("\n"),
		stats: createScenarioStats("owner"),
	}
}

function createVisitorProfile(isFollowing: boolean): UserProfile {
	return {
		id: isFollowing ? 2 : 3,
		name: isFollowing ? "Kirisame Marisa" : "Usami Sumireko",
		last_login: isFollowing
			? "2026-03-27T14:05:00.000Z"
			: "2026-03-25T18:40:00.000Z",
		avatar_url: assetUrl("/img/logo.png"),
		banner_url: isFollowing ? undefined : assetUrl("/img/cover/release/1.png"),
		is_following: isFollowing,
		roles: [
			{
				id: 2,
				name: "Moderator",
			},
		],
		bio: isFollowing
			? "访客视角下用于检查 following 状态与无横幅布局。"
			: "用于检查未关注访客的 CTA、横幅与信息区组合。",
		stats: createScenarioStats(
			isFollowing ? "visitor-following" : "visitor-unfollowed",
		),
	}
}

function createEmptyProfile(): UserProfile {
	return {
		id: 4,
		name: "No Data User",
		last_login: "2026-03-26T08:00:00.000Z",
		avatar_url: undefined,
		banner_url: undefined,
		is_following: undefined,
		roles: [],
		bio: undefined,
		stats: createScenarioStats("empty"),
	}
}

function createScenarioProfile(scenario: ProfileScenario): UserProfile {
	switch (scenario) {
		case "owner": {
			return createOwnerProfile()
		}
		case "visitor-following": {
			return createVisitorProfile(true)
		}
		case "visitor-unfollowed": {
			return createVisitorProfile(false)
		}
		case "empty": {
			return createEmptyProfile()
		}
	}
}

function createScenarioStats(scenario: ProfileScenario): UserProfileStats {
	switch (scenario) {
		case "owner": {
			return {
				edit_count: 152,
				vote_count: 57,
			}
		}
		case "visitor-following": {
			return {
				edit_count: 5,
				vote_count: 18,
			}
		}
		case "visitor-unfollowed": {
			return {
				edit_count: 12,
				vote_count: 9,
			}
		}
		case "empty": {
			return {
				edit_count: 0,
				vote_count: 0,
			}
		}
	}
}

function createFallbackBio(scenario: ProfileScenario) {
	switch (scenario) {
		case "owner": {
			return createOwnerProfile().bio
		}
		case "visitor-following":
		case "visitor-unfollowed": {
			return "补充简介后用来检查 markdown 与段落节奏。"
		}
		case "empty": {
			return "用于验证空资料场景被 controls 覆盖后的版面表现。"
		}
	}
}

function createFallbackRoles(
	scenario: ProfileScenario,
): NonNullable<UserProfile["roles"]> {
	switch (scenario) {
		case "owner": {
			return createOwnerProfile().roles ?? []
		}
		case "visitor-following":
		case "visitor-unfollowed": {
			return [
				{
					id: 2,
					name: "Moderator",
				},
			]
		}
		case "empty": {
			return [
				{
					id: 3,
					name: "User",
				},
			]
		}
	}
}

function selectStats(
	scenario: ProfileScenario,
	statsPreset: StatsPreset,
): UserProfileStats {
	if (statsPreset === "zero") {
		return {
			edit_count: 0,
			vote_count: 0,
		}
	}

	return createScenarioStats(scenario)
}

function selectPins(preset: FeedPreset): readonly PinItem[] {
	switch (preset) {
		case "none": {
			return []
		}
		case "few": {
			return EXTRA_HIGHLIGHTS.slice(0, 2)
		}
		case "many": {
			return EXTRA_HIGHLIGHTS
		}
	}
}

function selectActivity(preset: FeedPreset): readonly ActivityItem[] {
	switch (preset) {
		case "none": {
			return []
		}
		case "few": {
			return EXTRA_ACTIVITY.slice(0, 2)
		}
		case "many": {
			return EXTRA_ACTIVITY
		}
	}
}

function buildStoryState(options: StoryRootProps): {
	data: ProfileData
	roles: UserProfile["roles"]
	isCurrentUser: boolean
	pins: readonly PinItem[]
	activity: readonly ActivityItem[]
	action:
		| {
				onFollow: () => void
				onUnfollow: () => void
		  }
		| undefined
} {
	const profile = createScenarioProfile(options.scenario)
	const isCurrentUser = options.scenario === "owner"
	const canShowVisitorAction = options.isSignedIn && !isCurrentUser

	return {
		data: {
			name: profile.name,
			avatar_url: profile.avatar_url,
			banner_url: options.hasBanner
				? (profile.banner_url ?? assetUrl("/img/cover/release/1.png"))
				: undefined,
			bio: options.hasBio
				? (profile.bio ?? createFallbackBio(options.scenario))
				: undefined,
			is_following:
				isCurrentUser || options.isSignedIn ? profile.is_following : undefined,
			stats: selectStats(options.scenario, options.statsPreset),
		},
		roles: options.hasRoles ? createFallbackRoles(options.scenario) : [],
		isCurrentUser,
		pins: selectPins(options.highlightsPreset),
		activity: selectActivity(options.activityPreset),
		action: canShowVisitorAction
			? {
					onFollow: () => undefined,
					onUnfollow: () => undefined,
				}
			: undefined,
	}
}

function StoryRoot(props: StoryRootProps) {
	const [tab, setTab] = createSignal<"activity" | "collections">("collections")
	const state = createMemo(() =>
		buildStoryState({
			scenario: props.scenario,
			isSignedIn: props.isSignedIn,
			hasBanner: props.hasBanner,
			hasBio: props.hasBio,
			hasRoles: props.hasRoles,
			statsPreset: props.statsPreset,
			highlightsPreset: props.highlightsPreset,
			activityPreset: props.activityPreset,
		}),
	)

	return (
		<Profile
			collections={OWN_COLLECTIONS}
			hasMoreCollections={false}
			isFetchingMoreCollections={false}
			onLoadMoreCollections={() => undefined}
			followedCollections={FOLLOWED_COLLECTIONS}
			hasMoreFollowedCollections={false}
			isFetchingMoreFollowedCollections={false}
			onLoadMoreFollowedCollections={() => undefined}
			tab={{
				value: tab(),
				onChange: setTab,
			}}
			data={state().data}
			roles={state().roles}
			isCurrentUser={state().isCurrentUser}
			pins={state().pins}
			activity={state().activity}
			action={state().action}
		/>
	)
}

const meta = {
	title: "View/User/Profile",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.FullScreen,
		backgrounds: {
			grid: {
				disable: true,
			},
		},
	},
	globals: {
		backgrounds: {
			value: "studio",
		},
	},
	argTypes: {
		scenario: {
			control: { type: "radio" },
			options: ["owner", "visitor-following", "visitor-unfollowed", "empty"],
		},
		isSignedIn: { control: { type: "boolean" } },
		hasBanner: { control: { type: "boolean" } },
		hasBio: { control: { type: "boolean" } },
		hasRoles: { control: { type: "boolean" } },
		statsPreset: {
			control: { type: "radio" },
			options: ["default", "zero"],
		},
		highlightsPreset: {
			control: { type: "radio" },
			options: ["none", "few", "many"],
		},
		activityPreset: {
			control: { type: "radio" },
			options: ["none", "few", "many"],
		},
	},
	args: DEFAULT_ARGS,
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
