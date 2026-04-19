import { t } from "@lingui/core/macro"
import type { JSX } from "solid-js"

import { Link } from "~/component/atomic/Link"
import type { LinkProps } from "~/component/atomic/Link"

type ExploreSectionProps = {
	title: string
	to: LinkProps["to"]
	children: JSX.Element
}

export function ExploreSection(props: ExploreSectionProps) {
	return (
		<div class="flex flex-col gap-4">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-light tracking-tight text-primary">
					{props.title}
				</h2>
				<Link
					to={props.to}
					class="text-sm text-tertiary no-underline hover:text-primary hover:no-underline"
				>
					{t`Explore`} →
				</Link>
			</div>

			{props.children}
		</div>
	)
}
