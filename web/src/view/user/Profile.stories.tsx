import type { UserProfile, UserProfileStats } from "@thc/api"
import { createMemo, createSignal } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import baka from "~/component/atomic/avatar/baka.jpg"
import type { UserCollection } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"

import type { ActivityItem, PinItem, ProfileData } from "./Profile"
import { Profile } from "./Profile"

const ORIGIN = globalThis.location.origin

type ProfileScenario =
	| "owner"
	| "owner-followed-by-viewer"
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
		title: "Lovelight",
		subtitle: "Alstroemeria Records · Reitaisai 4",
		coverUrl: "/img/cover/release/1.png",
		to: { to: "/release/$id", params: { id: "1" } },
	},
	{
		accent: "Blue",
		kind: "Song",
		title: "U.N. Owen Was Her? (Piano ver.)",
		subtitle: "Solo piano arrangement of Flandre’s theme",
		to: { to: "/song/$id", params: { id: "9" } },
	},
	{
		accent: "Slate",
		kind: "Tag",
		title: "Trance",
		subtitle: "A genre for melodic electronic arrangements",
		to: { to: "/tag/$id", params: { id: "3" } },
	},
	{
		accent: "Green",
		kind: "Artist",
		title: "FELT",
		subtitle: "Doujin music circle",
		to: { to: "/artist/$id", params: { id: "12" } },
	},
	{
		accent: "Blue",
		kind: "Release",
		title: "Midnight Shrine Broadcast",
		subtitle: "Six live arrangements from the winter show",
		coverUrl: "/img/cover/release/1.png",
		to: { to: "/release/$id", params: { id: "42" } },
	},
	{
		accent: "Green",
		kind: "Artist",
		title: "ShibayanRecords",
		subtitle: "Known for vocal and electronic arrangements",
		to: { to: "/artist/$id", params: { id: "52" } },
	},
] satisfies readonly [PinItem, ...PinItem[]]

const EXTRA_ACTIVITY: readonly ActivityItem[] = [
	{
		at: "2025-12-28T10:42:00.000Z",
		accent: "Reimu",
		action: "Added release",
		entity: "Scarlet Sessions",
		detail: "Added the cover and track list from the CD booklet.",
		link: { to: "/release/$id", params: { id: "101" } },
	},
	{
		at: "2025-12-27T23:05:00.000Z",
		accent: "Blue",
		action: "Corrected credit",
		entity: "U.N. Owen Was Her? (Piano ver.)",
		detail: "Corrected the pianist credit using the liner notes.",
		link: { to: "/song/$id", params: { id: "9" } },
	},
	{
		at: "2025-12-27T09:14:00.000Z",
		accent: "Slate",
		action: "Tagged song",
		entity: "少女さとり ～ 3rd eye",
		detail: "Added the Orchestral tag.",
		link: { to: "/song/$id", params: { id: "12" } },
	},
	{
		at: "2025-12-26T16:22:00.000Z",
		accent: "Green",
		action: "Created tag",
		entity: "Live recording",
		detail: "For recordings made at concerts and live events.",
		link: { to: "/tag/$id", params: { id: "21" } },
	},
	{
		at: "2025-12-24T11:12:00.000Z",
		accent: "Blue",
		action: "Updated release notes",
		entity: "Dream Layer EP",
		detail: "Added the Japanese title and the original release date.",
		link: { to: "/release/$id", params: { id: "103" } },
	},
	{
		at: "2025-12-23T05:18:00.000Z",
		accent: "Slate",
		action: "Updated artist",
		entity: "SOUND HOLIC",
		detail: "Linked two releases that were missing from the discography.",
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

export const OWN_COLLECTIONS: readonly UserCollection[] = [
	{
		id: 101,
		owner: OWNER,
		name: "Where to start with Touhou arranges",
		description:
			"The albums I send friends when they ask what to listen to first.",
		is_public: true,
		item_count: 24,
		follower_count: 8,
		is_following: null,
	},
	{
		id: 102,
		owner: OWNER,
		name: "Albums to check against the booklet",
		description: "I still need to confirm a few track titles and credits.",
		is_public: false,
		item_count: 7,
		follower_count: 0,
		is_following: null,
	},
	{
		id: 103,
		owner: OWNER,
		name: "Touhou vocal favorites",
		description:
			"Vocal arranges I keep coming back to, from FELT to SOUND HOLIC.",
		is_public: true,
		item_count: 16,
		follower_count: 5,
		is_following: null,
	},
]

export const FOLLOWED_COLLECTIONS = [
	{
		followed_at: "2026-05-20T12:00:00.000Z",
		collection: {
			id: 201,
			owner: {
				id: 2,
				name: "Kirisame Marisa",
			},
			name: "Piano after midnight",
			description: "Quiet piano arrangements for late-night listening.",
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
			name: "Reitaisai finds",
			description: "Albums I picked up at Reitaisai and want to hear again.",
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
		bio: "I collect Touhou arrangements, especially piano and vocals. I add release dates and track credits when I can check them against the CD booklet.\n\nFELT and Alstroemeria Records are usually on repeat.",
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
			? "I collect old Touhou CDs and add missing track credits when I have the booklet."
			: "I mostly listen to piano and jazz arrangements. Lately I’ve been exploring older Reitaisai releases.",
		stats: createScenarioStats(
			isFollowing ? "visitor-following" : "visitor-unfollowed",
		),
	}
}

function createEmptyProfile(): UserProfile {
	return {
		id: 4,
		name: "Rinnosuke Morichika",
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
		case "owner-followed-by-viewer": {
			return { ...createOwnerProfile(), is_following: true }
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
		case "owner-followed-by-viewer":
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
		case "owner-followed-by-viewer":
		case "owner": {
			return createOwnerProfile().bio
		}
		case "visitor-following":
		case "visitor-unfollowed": {
			return "I’m working through my Touhou CD shelf, one album at a time."
		}
		case "empty": {
			return "I keep a list of albums I want to hear and fill in release details when I can."
		}
	}
}

function createFallbackRoles(
	scenario: ProfileScenario,
): NonNullable<UserProfile["roles"]> {
	switch (scenario) {
		case "owner-followed-by-viewer":
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
	const state = createMemo(() => buildStoryState(props))

	return (
		<Profile
			collections={
				state().isCurrentUser
					? OWN_COLLECTIONS
					: OWN_COLLECTIONS.filter((item) => item.is_public)
			}
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
	decorators: [withStoryState, withStoryRouter],
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
			options: [
				"owner",
				"owner-followed-by-viewer",
				"visitor-following",
				"visitor-unfollowed",
				"empty",
			],
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
