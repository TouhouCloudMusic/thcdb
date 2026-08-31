import { useLingui } from "@lingui/solid/macro"
import { ArrowRightIcon } from "@thc/icons/radix"
import type { JSX } from "solid-js"

import { Link } from "~/component/atomic/Link"
import type { LinkProps } from "~/component/atomic/Link"

type ExploreSectionProps = {
	title: string
	to: LinkProps["to"]
	children: JSX.Element
}

export function ExploreSection(props: ExploreSectionProps) {
	const { t } = useLingui()
	return (
		<div class="flex flex-col gap-4">
			<div class="flex items-baseline justify-between">
				<h2 class="text-xl font-light tracking-tight text-primary">
					{props.title}
				</h2>
				<Link
					to={props.to}
					underline={false}
					class="inline-flex items-center text-sm font-light tracking-tight text-tertiary hover:text-primary"
				>
					{t`Explore`}
					<ArrowRightIcon class="mx-1 size-3.5" />
				</Link>
			</div>

			{props.children}
		</div>
	)
}
