import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { createMockTagTree } from "~/mock/tag"
import { StoryLayout, withStoryRouter } from "~/utils/adapter/storybook"
import { TagTree } from "~/view/tag/TagTree"
import type { TagTreeNode } from "~/view/tag/TagTree"

const TAG_TREE_HEADING_ID = "tag-tree-title"
const TAG_TREE_PADDING_CLASS = "px-3"

const DEFAULT_TREE = createMockTagTree({
	rootCount: 2,
	maxDepth: 3,
	childCountRange: [1, 2],
})

type StoryRootProps = {
	nodes: TagTreeNode[]
}

function StoryRoot(props: StoryRootProps) {
	return (
		<div class={`${TAG_TREE_PADDING_CLASS} bg-primary`}>
			<div class="w-[560px]">
				<h2
					id={TAG_TREE_HEADING_ID}
					class="mb-3 text-lg font-medium"
				>
					Tag Tree
				</h2>
				<TagTree
					nodes={props.nodes}
					headingId={TAG_TREE_HEADING_ID}
				/>
			</div>
		</div>
	)
}

const meta = {
	title: "View/Explore/Tag",
	component: StoryRoot,
	decorators: [withStoryRouter],
	parameters: {
		layout: StoryLayout.Centered,
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
		nodes: {
			control: false,
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		nodes: DEFAULT_TREE,
	},
}
