import type { LinkComponentProps } from "@tanstack/solid-router"
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

import { LocaleSelect } from "~/component/Header/LocaleSelect"
import { ListItem, Sidebar } from "~/component/Sidebar"

type ListItemContent = {
	icon: (props: IconProps) => JSX.Element
	readonly text: string
	to: LinkComponentProps["to"]
}

export function LeftSidebar() {
	// TODO: Icons
	const LIST_ITEMS: ListItemContent[] = [
		{
			icon: HomeIcon,
			// @wc-include
			get text() {
				return "Home"
			},
			to: "/",
		},
		{
			icon: TargetIcon,
			// @wc-include
			get text() {
				return "Recommendation"
			},
			to: "/recommendation",
		},
		{
			icon: CrumpledPaperIcon,
			// @wc-include
			get text() {
				return "Release"
			},
			to: "/release/explore",
		},
		{
			icon: MixerHorizontalIcon,
			// @wc-include
			get text() {
				return "Artist"
			},
			to: "/artist/explore",
		},
		{
			icon: CardStackIcon,
			// @wc-include
			get text() {
				return "Song"
			},
			to: "/song/explore",
		},
		{
			icon: EnvelopeClosedIcon,
			// @wc-include
			get text() {
				return "Tag"
			},
			to: "/tag/explore",
		},
		{
			icon: EnvelopeClosedIcon,
			// @wc-include
			get text() {
				return "Event"
			},
			to: "/event/explore",
		},
		{
			icon: BookmarkIcon,
			// @wc-include
			get text() {
				return "Label"
			},
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

			<div class="mt-auto space-y-2 px-2">
				<h3 class="text-sm text-secondary">Settings</h3>
				<div class="space-y-2">
					<div class="text-sm text-tertiary">Language</div>
					<LocaleSelect />
				</div>
			</div>
		</Sidebar>
	)
}
