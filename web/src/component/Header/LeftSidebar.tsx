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
} from "solid-radix-icons"

import { ListItem, Sidebar } from "~/component/Sidebar"

type ListItemContent = {
	icon: (props: IconProps) => JSX.Element
	text: string
}

export function LeftSidebar() {
	const { t } = useLingui()
	// TODO: Icons
	const LIST_ITEMS: ListItemContent[] = [
		{
			icon: TargetIcon,
			text: t`Recommandation`,
		},
		{
			icon: RankingIcon,
			text: t`Chart`,
		},
		{
			icon: CardStackIcon,
			text: t`Song`,
		},
		{
			icon: CrumpledPaperIcon,
			text: t`Release`,
		},
		{
			icon: MixerHorizontalIcon,
			text: t`Artist`,
		},
		{
			icon: EnvelopeClosedIcon,
			text: t`Event`,
		},
		{
			icon: EnvelopeClosedIcon,
			text: t`Tag`,
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
								<ListItem class="w-full">
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
