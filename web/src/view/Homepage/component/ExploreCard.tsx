import { useLingui } from "@lingui/solid/macro"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import type { HomeNavItem } from "~/view/Homepage/mock"

const ACCENT = {
	Reimu: {
		badge: "bg-reimu-100 text-reimu-800 ring-reimu-200",
		ring: "ring-reimu-200 hover:ring-reimu-300",
	},
	Marisa: {
		badge: "bg-marisa-100 text-marisa-800 ring-marisa-200",
		ring: "ring-marisa-200 hover:ring-marisa-300",
	},
	Blue: {
		badge: "bg-blue-100 text-blue-800 ring-blue-200",
		ring: "ring-blue-200 hover:ring-blue-300",
	},
	Green: {
		badge: "bg-green-100 text-green-800 ring-green-200",
		ring: "ring-green-200 hover:ring-green-300",
	},
	Slate: {
		badge: "bg-slate-100 text-primary ring-slate-200",
		ring: "ring-slate-200 hover:ring-slate-300",
	},
} satisfies Record<HomeNavItem["accent"], { badge: string; ring: string }>

type ExploreCardProps = {
	item: HomeNavItem
}

export function ExploreCard(props: ExploreCardProps) {
	const { t } = useLingui()
	const title = () => {
		switch (props.item.to) {
			case "/artist/explore": {
				return t`Artists`
			}
			case "/release/explore": {
				return t`Releases`
			}
			case "/song/explore": {
				return t`Songs`
			}
			case "/tag/explore": {
				return t`Tags`
			}
			case "/event/explore": {
				return t`Events`
			}
			case "/label/explore": {
				return t`Labels`
			}
		}
	}
	const description = () => {
		switch (props.item.to) {
			case "/artist/explore": {
				return t`Browse circles and solo creators with filters and sorting.`
			}
			case "/release/explore": {
				return t`Track albums and compilations, link artists and events.`
			}
			case "/song/explore": {
				return t`Find tracks by title language, credits, and corrections.`
			}
			case "/tag/explore": {
				return t`Navigate genres, themes and metadata through tag types.`
			}
			case "/event/explore": {
				return t`See conventions and live shows where releases debuted.`
			}
			case "/label/explore": {
				return t`Explore labels, imprint history and founded/dissolved dates.`
			}
		}
	}
	return (
		<Link
			to={props.item.to}
			class="group block no-underline hover:no-underline"
		>
			<Card
				class={`flex h-full flex-col justify-between gap-4 rounded-none border border-slate-300 p-5 shadow-xs ring-1 transition-all duration-150 ring-inset motion-reduce:transition-none ${ACCENT[props.item.accent].ring} hover:-translate-y-0.5 hover:shadow-sm motion-reduce:hover:translate-y-0`}
			>
				<div class="flex items-start justify-between gap-4">
					<div class="flex flex-col gap-2">
						<div
							class={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs ring-1 ring-inset ${ACCENT[props.item.accent].badge}`}
						>
							<span class="inline-block size-1.5 rounded-full bg-current opacity-70"></span>
							{t`Explore`}
						</div>
						<div class="text-base font-medium text-primary">{title()}</div>
					</div>
					<div class="font-mono text-xs text-tertiary transition-colors duration-150 group-hover:text-secondary motion-reduce:transition-none">
						→
					</div>
				</div>

				<div class="text-sm leading-relaxed text-secondary">
					{description()}
				</div>
			</Card>
		</Link>
	)
}
