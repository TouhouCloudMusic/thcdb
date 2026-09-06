import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Divider } from "~/component/atomic/Divider"
import { Intersperse } from "~/component/data/Intersperse"
import { ExplorePageLayout } from "~/component/feature/entity_explore"
import type { TagListItem } from "~/hey-api"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { TagItem } from "~/view/tag/TagItem"

const TAGS: TagListItem[] = [
	{
		id: 3,
		name: "Progressive metal",
		type: "Genre",
		short_description:
			"Metal arrangements built around extended forms and changing time signatures.",
		parents: [
			{ id: 2, name: "Progressive rock", type: "Genre" },
			{ id: 1, name: "Rock", type: "Genre" },
		],
	},
	{
		id: 7,
		name: "Instrumental arrangement — piano, orchestra and acoustic ensembles",
		type: "Descriptor",
		short_description:
			"Arrangements presented without a lead vocal performance.",
		parents: [
			{ id: 5, name: "東方アレンジ", type: "Descriptor" },
			{ id: 6, name: "Instrumental arrangement", type: "Descriptor" },
		],
	},
	{
		id: 8,
		name: "Live recording",
		type: "Descriptor",
		short_description: "",
		parents: [],
	},
]

type StoryRootProps = {
	tags: TagListItem[]
	width: "full" | "narrow"
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div
			class={`mx-auto w-full ${props.width === "narrow" ? "max-w-sm" : "max-w-3xl"}`}
		>
			<ExplorePageLayout
				title="Explore Tags"
				action={{ to: "/tag/new", label: "Create tag" }}
			>
				<div class="flex flex-col gap-2 p-4">
					<Intersperse
						of={props.tags}
						with={<Divider horizontal />}
					>
						{(tag) => <TagItem tag={tag} />}
					</Intersperse>
				</div>
			</ExplorePageLayout>
		</div>
	)
}

const meta = {
	title: "View/Explore/Tag",
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
	args: {
		tags: TAGS,
		width: "full",
	},
	argTypes: {
		tags: { control: false },
		width: {
			control: "select",
			options: ["full", "narrow"],
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const List: Story = {}

export const Narrow: Story = {
	args: { width: "narrow" },
}
