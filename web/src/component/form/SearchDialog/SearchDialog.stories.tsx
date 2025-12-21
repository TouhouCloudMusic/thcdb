import { Cross2Icon, PlusIcon } from "solid-radix-icons"
import type { Meta, StoryObj } from "storybook-solidjs"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"

import { SearchDialog } from "."

// Create a wrapper component for the story
function SearchDialogExample() {
	const sampleData = [
		{ id: 1, name: "Apple", category: "Fruit" },
		{ id: 2, name: "Banana", category: "Fruit" },
		{ id: 3, name: "Carrot", category: "Vegetable" },
		{ id: 4, name: "Broccoli", category: "Vegetable" },
	]

	return (
		<SearchDialog.Root defaultOpen={true}>
			<Dialog.Trigger
				as={Button}
				variant="Tertiary"
				size="Xs"
				class="aspect-square p-1.5"
			>
				<PlusIcon />
			</Dialog.Trigger>
			<SearchDialog.Content>
				<div class="mx-4 flex justify-between">
					<SearchDialog.Label>添加物品</SearchDialog.Label>
					<Dialog.CloseButton class="aspect-square h-full p-1">
						<Cross2Icon class="m-auto" />
					</Dialog.CloseButton>
				</div>
				<div class="mx-4">
					<div class="relative mt-3 mb-6">
						<SearchDialog.Input placeholder="搜索物品..." />
					</div>
				</div>

				<SearchDialog.List>
					{sampleData.map((item) => (
						<li class="border-y-1.5 border-slate-200 bg-primary px-4 py-2">
							<div class="font-medium">{item.name}</div>
							<div class="text-sm text-slate-500">{item.category}</div>
						</li>
					))}
				</SearchDialog.List>
			</SearchDialog.Content>
		</SearchDialog.Root>
	)
}

const meta = {
	component: SearchDialogExample,
	tags: ["autodocs"],
	parameters: {
		docs: {
			description: {
				component:
					"Basic search dialog components: Root (wraps Dialog.Root), Label (dialog title), Input (search input with icon), and List (basic list container).",
			},
		},
	},
} satisfies Meta<typeof SearchDialogExample>

export default meta
type Story = StoryObj<typeof SearchDialogExample>

// 示例
export const Default: Story = {
	render: () => <SearchDialogExample />,
}
