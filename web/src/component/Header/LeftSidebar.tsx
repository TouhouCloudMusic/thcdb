import { Trans, useLingui } from "@lingui-solid/solid/macro"
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
	const { t } = useLingui()
	const navigate = useNavigate()
	// TODO: Icons
	const LIST_ITEMS: ListItemContent[] = [
		{
			icon: HomeIcon,
			text: t`Home`,
			to: "/",
		},
		{
			icon: TargetIcon,
			text: t`Recommandation`,
			to: "/recommendation",
		},
		{
			icon: CrumpledPaperIcon,
			text: t`Release`,
			to: "/release/explore",
		},
		{
			icon: MixerHorizontalIcon,
			text: t`Artist`,
			to: "/artist/explore",
		},
		{
			icon: CardStackIcon,
			text: t`Song`,
			to: "/song/explore",
		},
		{
			icon: EnvelopeClosedIcon,
			text: t`Tag`,
			to: "/tag/explore",
		},
		{
			icon: EnvelopeClosedIcon,
			text: t`Event`,
			to: "/event/explore",
		},
		{
			icon: BookmarkIcon,
			text: t`Label`,
			to: "/label/explore",
		},
	]

	return (
		<Sidebar class="flex w-64 flex-col p-4">
			<div class="mt-2 flex flex-col space-y-2">
				<h3 class="ml-2 text-xs font-semibold text-slate-600">
					<Trans>Discover</Trans>
				</h3>

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
