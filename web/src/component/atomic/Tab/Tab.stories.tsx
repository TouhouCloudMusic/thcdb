import { createSignal, For, Show } from "solid-js"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { StoryLayout } from "~/utils/adapter/storybook"

import { Tab } from "."

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
			class="w-full max-w-[960px] border border-slate-200 bg-white"
			value={activeTab()}
			onChange={setActiveTab}
		>
			<Tab.ScrollArea>
				<Tab.List class={Tab.CONTAINER_CLASS}>
					<For each={ENTITY_DETAIL_TABS}>
						{(tab) => (
							<Tab.Trigger
								value={tab}
								class="flex items-center gap-2 py-3"
							>
								<span>{tab}</span>
								<Show when={tab === "Comments"}>
									<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-secondary">
										0
									</span>
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
