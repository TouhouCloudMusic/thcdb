import type { IconProps } from "@thc/icons"
import type { LinkComponentProps } from "@tanstack/solid-router"
import type { JSX } from "solid-js"
import { For } from "solid-js"
import {
	CardStackIcon,
	BookmarkIcon,
	EnvelopeClosedIcon,
	MixerHorizontalIcon,
	TargetIcon,
	CrumpledPaperIcon,
	HomeIcon,
} from "solid-radix-icons"

import { ListItem, Sidebar } from "~/component/Sidebar"

type ListItemContent = {
	icon: (props: IconProps) => JSX.Element
	text: string
	to: LinkComponentProps<"a">["to"]
}

export function LeftSidebar() {
	// TODO: Icons
	const LIST_ITEMS: ListItemContent[] = [
		{
			icon: HomeIcon,
			text: "Home",
			to: "/",
		},
		{
			icon: TargetIcon,
			text: "Recommendation",
			to: "/recommendation",
		},
		{
			icon: CrumpledPaperIcon,
			text: "Release",
			to: "/release/explore",
		},
		{
			icon: MixerHorizontalIcon,
			text: "Artist",
			to: "/artist/explore",
		},
		{
			icon: CardStackIcon,
			text: "Song",
			to: "/song/explore",
		},
		{
			icon: EnvelopeClosedIcon,
			text: "Tag",
			to: "/tag/explore",
		},
		{
			icon: EnvelopeClosedIcon,
			text: "Event",
			to: "/event/explore",
		},
		{
			icon: BookmarkIcon,
			text: "Label",
			to: "/label/explore",
		},
	]

	return (
		<Sidebar class="flex w-64 flex-col gap-2 p-4">
			<h3 class="ml-2 text-sm text-secondary ">Explore</h3>

			<ul class="space-y-1 pr-2">
				<For each={LIST_ITEMS}>
					{(item) => {
						return (
							<ListItem
								class="w-full"
								aria-label={item.text}
								title={item.text}
								to={item.to}
							>
								<item.icon class="mr-3 h-4 w-4" />
								<span>{item.text}</span>
							</ListItem>
						)
					}}
				</For>
			</ul>
		</Sidebar>
	)
}
