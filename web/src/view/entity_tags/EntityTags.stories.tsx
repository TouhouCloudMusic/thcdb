import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { PRIMARY_TAG_RELEVANCE_THRESHOLD } from "~/domain/tag/constants"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { withStoryState } from "~/utils/adapter/storybook-state"

import { EntityTagsView } from "./EntityTags"
import type { EntityTagsViewProps } from "./EntityTags"

const MOCK_TAGS: EntityTagsViewProps["tags"] = [
	{
		id: 101,
		name: "Symphonic Rock",
		short_description: "Orchestral arrangement with a rock rhythm section.",
		count: 12,
		relevance: 2.58,
		user_vote: 3,
		votes: [
			{ user_name: "alice", score: 3 },
			{ user_name: "bob", score: 2 },
		],
	},
	{
		id: 102,
		name: "Touhou Arrange",
		short_description: "Derivative arrangement based on Touhou melodies.",
		count: 8,
		relevance: 2.12,
		user_vote: 1,
		votes: [{ user_name: "carol", score: 1 }],
	},
	{
		id: 103,
		name: "Instrumental",
		short_description: "",
		count: 5,
		relevance: 1.8,
		user_vote: null,
		votes: [],
	},
	{
		id: 104,
		name: "Game Music",
		short_description: "Music written for or associated with a video game.",
		count: 4,
		relevance: 1.62,
		user_vote: null,
		votes: [],
	},
	{
		id: 105,
		name: "Electronic",
		short_description:
			"Music centered on electronic instruments and production.",
		count: 3,
		relevance: 1.5,
		user_vote: null,
		votes: [],
	},
	{
		id: 106,
		name: "Vocal",
		short_description: "Music featuring a sung vocal performance.",
		count: 2,
		relevance: 1.25,
		user_vote: null,
		votes: [],
	},
]

const STATES = [
	"Complete",
	"Primary only",
	"Secondary only",
	"Loading",
] as const
type State = (typeof STATES)[number]

const TAGS_BY_STATE = {
	Complete: MOCK_TAGS,
	"Primary only": MOCK_TAGS.filter(
		(tag) => tag.relevance > PRIMARY_TAG_RELEVANCE_THRESHOLD,
	),
	"Secondary only": MOCK_TAGS.filter(
		(tag) => tag.relevance <= PRIMARY_TAG_RELEVANCE_THRESHOLD,
	),
	Loading: [],
} satisfies Record<State, EntityTagsViewProps["tags"]>

const NOOP_PROMISE = Promise.resolve()

async function noopVote() {
	await NOOP_PROMISE
}

function StoryRoot(props: {
	isSignedIn: boolean
	state: State
	pendingKey?: string
}) {
	return (
		<div class="min-h-[480px] bg-slate-100 p-6">
			<div class="mx-auto max-w-3xl rounded border border-slate-200 bg-white p-6">
				<EntityTagsView
					tags={TAGS_BY_STATE[props.state]}
					isSignedIn={props.isSignedIn}
					isLoading={props.state === "Loading"}
					pendingKey={props.pendingKey}
					onVote={noopVote}
					onRemoveVote={noopVote}
				/>
			</div>
		</div>
	)
}

const meta = {
	title: "View/EntityTags",
	component: StoryRoot,
	decorators: [withStoryState, withStoryRouter],
	parameters: {
		layout: StoryLayout.Padded,
	},
	argTypes: {
		state: {
			control: { type: "select" },
			options: STATES,
		},
		pendingKey: { control: false },
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Playground: Story = {
	args: {
		isSignedIn: true,
		state: "Complete",
	},
}
