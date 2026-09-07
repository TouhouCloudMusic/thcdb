import * as stylex from "@stylexjs/stylex"
import { createSignal, For, Show } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { palette } from "~/style/color/palette.stylex"
import { radius, colors, fontSizes, px } from "~/style/tokens.stylex"
import { StoryLayout } from "~/utils/adapter/storybook"

import { Tab } from "."

const styles = stylex.create({
	root: {
		width: "100%",
		maxWidth: "960px",
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: palette.white,
	},
	trigger: {
		display: "flex",
		alignItems: "center",
		gap: px[8],
		paddingBlock: px[12],
	},
	badge: {
		borderRadius: radius.full,
		backgroundColor: palette.slate[100],
		paddingInline: px[8],
		paddingBlock: px[2],
		fontSize: fontSizes.xs,
		lineHeight: "1rem",
		fontWeight: 500,
		color: colors.textSecondary,
	},
})

const ENTITY_DETAIL_TABS = [
	"Release",
	"Credits",
	"Lyrics",
	"Relations",
	"Comments",
	"Collections",
] as const

function EntityDetailTabs() {
	const [activeTab, setActiveTab] = createSignal(ENTITY_DETAIL_TABS[0])

	return (
		<Tab.Root
			styles={styles.root}
			value={activeTab()}
			onChange={setActiveTab}
		>
			<Tab.ScrollArea>
				<Tab.List styles={Tab.containerStyles}>
					<For each={ENTITY_DETAIL_TABS}>
						{(tab) => (
							<Tab.Trigger
								value={tab}
								styles={styles.trigger}
							>
								<span>{tab}</span>
								<Show when={tab === "Comments"}>
									<span {...stylex.attrs(styles.badge)}>0</span>
								</Show>
							</Tab.Trigger>
						)}
					</For>
					<Tab.Indicator />
				</Tab.List>
			</Tab.ScrollArea>
		</Tab.Root>
	)
}

const meta = {
	title: "Component/Tab",
	component: EntityDetailTabs,
	parameters: {
		layout: StoryLayout.Padded,
	},
} satisfies Meta<typeof EntityDetailTabs>

export default meta

type Story = StoryObj<typeof meta>

export const EntityDetails: Story = {}
