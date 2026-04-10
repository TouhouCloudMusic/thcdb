import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"

import { EntityTagsSection } from "./EntityTagsSection"
import type { EntityTagsSectionProps } from "./EntityTagsSection"

const MOCK_TAGS: EntityTagsSectionProps["tags"] = [
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
]

const NOOP_PROMISE = Promise.resolve()

async function noopVote() {
	await NOOP_PROMISE
}

function StoryRoot(props: {
	isSignedIn: boolean
	isLoading: boolean
	tags: EntityTagsSectionProps["tags"]
	pendingKey?: string
}) {
	return (
		<div class="min-h-[480px] bg-slate-100 p-6">
			<div class="mx-auto max-w-3xl rounded border border-slate-200 bg-white p-6">
				<EntityTagsSection
					tags={props.tags}
					isSignedIn={props.isSignedIn}
					isLoading={props.isLoading}
					pendingKey={props.pendingKey}
					onVote={noopVote}
					onRemoveVote={noopVote}
				/>
			</div>
		</div>
	)
}

const meta = {
	title: "View/EntityTags/Section",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.Padded,
	},
	argTypes: {
		tags: { control: false },
		pendingKey: { control: false },
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const ReadOnly: Story = {
	args: {
		isSignedIn: false,
		isLoading: false,
		tags: MOCK_TAGS,
	},
}

export const SignedIn: Story = {
	args: {
		isSignedIn: true,
		isLoading: false,
		tags: MOCK_TAGS,
	},
}

export const Empty: Story = {
	args: {
		isSignedIn: true,
		isLoading: false,
		tags: [],
	},
}

export const Loading: Story = {
	args: {
		isSignedIn: true,
		isLoading: true,
		tags: [],
	},
}
