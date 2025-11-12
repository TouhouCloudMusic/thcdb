import { Trans, useLingui } from "@lingui-solid/solid/macro"
import type { IconProps } from "@thc/icons"
import { RankingIcon } from "@thc/icons/custom"
import type { JSX } from "solid-js"
import { For } from "solid-js"
import {
	CardStackIcon,
	EnvelopeClosedIcon,
	MixerHorizontalIcon,
	TargetIcon,
	CrumpledPaperIcon,
	HomeIcon,
} from "solid-radix-icons"
import { useNavigate } from "@tanstack/solid-router"

import { ListItem, Sidebar } from "~/component/Sidebar"
import { cons } from "effect/List"

type ListItemContent = {
	icon: (props: IconProps) => JSX.Element
	text: string,
	to: string,
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
			icon: RankingIcon,
			text: t`Chart`,
			to: "/chart",
		},
		{
			icon: CardStackIcon,
			text: t`Song`,
			to: "/song",
		},
		{
			icon: CrumpledPaperIcon,
			text: t`Release`,
			to: "/release",
		},
		{
			icon: MixerHorizontalIcon,
			text: t`Artist`,
			to: "/artist",
		},
		{
			icon: EnvelopeClosedIcon,
			text: t`Event`,
			to: "/event",
		},
		{
			icon: EnvelopeClosedIcon,
			text: t`Tag`,
			to: "/tag",
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
								<ListItem class="w-full" onClick={() => navigate({ to: item.to })}>
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
