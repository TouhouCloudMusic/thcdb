import * as stylex from "@stylexjs/stylex"
import { Cross2Icon, PlusIcon } from "@thc/icons/radix"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { palette } from "~/style/color/palette.stylex"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { SearchDialog } from "."

// Create a wrapper component for the story
const styles = stylex.create({
	trigger: { aspectRatio: "1", padding: px[6] },
	header: {
		marginInline: px[16],
		display: "flex",
		justifyContent: "space-between",
	},
	close: { aspectRatio: "1", height: "100%", padding: px[4] },
	closeIcon: { margin: "auto" },
	body: { marginInline: px[16] },
	search: {
		position: "relative",
		marginTop: px[12],
		marginBottom: px[24],
	},
	item: {
		borderColor: palette.slate[200],
		backgroundColor: colors.backgroundPrimary,
		paddingInline: px[16],
		paddingBlock: px[8],
	},
	name: { fontWeight: 500 },
	category: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[500],
	},
})

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
				appearance="ghost"
				tone="gray"
				size="xs"
				styles={styles.trigger}
			>
				<PlusIcon />
			</Dialog.Trigger>
			<SearchDialog.Content>
				<div {...stylex.attrs(styles.header)}>
					<SearchDialog.Label>添加物品</SearchDialog.Label>
					<Dialog.CloseButton styles={styles.close}>
						<Cross2Icon {...stylex.attrs(styles.closeIcon)} />
					</Dialog.CloseButton>
				</div>
				<div {...stylex.attrs(styles.body)}>
					<div {...stylex.attrs(styles.search)}>
						<SearchDialog.Input placeholder="搜索物品..." />
					</div>
				</div>

				<ul {...stylex.attrs(SearchDialog.searchDialogStyles.list)}>
					{sampleData.map((item) => (
						<li {...stylex.attrs(styles.item)}>
							<div {...stylex.attrs(styles.name)}>{item.name}</div>
							<div {...stylex.attrs(styles.category)}>{item.category}</div>
						</li>
					))}
				</ul>
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
