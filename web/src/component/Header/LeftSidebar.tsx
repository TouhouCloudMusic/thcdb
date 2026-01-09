import { useNavigate } from "@tanstack/solid-router"
import type { IconProps } from "@thc/icons"
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
	to: string
}

export function LeftSidebar() {
	const navigate = useNavigate()
	// TODO: Icons
	const LIST_ITEMS: ListItemContent[] = [
		{
			icon: HomeIcon,
			text: "Home",
			to: "/",
		},
		{
			icon: TargetIcon,
			text: "Recommandation",
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
		<Sidebar class="flex w-64 flex-col p-4">
			<div class="mt-2 flex flex-col space-y-2">
				<h3 class="ml-2 text-xs font-semibold text-slate-600">Discover</h3>

				<ul class="space-y-1 pr-2">
					<For each={LIST_ITEMS}>
						{(item) => {
							return (
								<ListItem
									class="w-full"
									aria-label={item.text}
									title={item.text}
									onClick={() => navigate({ to: item.to })}
								>
									<item.icon class="mr-3 h-4 w-4" />
									<span>{item.text}</span>
								</ListItem>
							)
						}}
					</For>
				</ul>
			</div>
		</Sidebar>
	)
}
