import type { ParentProps } from "solid-js"
import { Show } from "solid-js"

import type { LinkProps } from "~/component/atomic"
import { Link } from "~/component/atomic"
import { PageLayout } from "~/layout"

type ExplorePageAction = {
	to: LinkProps["to"]
	label: string
}

type ExplorePageLayoutProps = ParentProps<{
	title: string
	action?: ExplorePageAction
	titleId?: string
	titleClass?: string
}>

export function ExplorePageLayout(props: ExplorePageLayoutProps) {
	return (
		<PageLayout class="flex flex-col gap-6 p-4 sm:p-8">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<h1
					id={props.titleId}
					class={"text-2xl font-light wrap-anywhere text-slate-900"}
				>
					{props.title}
				</h1>

				<Show when={props.action}>
					{(action) => (
						<Link
							to={action().to}
							class="text-sm font-light"
						>
							{action().label}
						</Link>
					)}
				</Show>
			</div>

			{props.children}
		</PageLayout>
	)
}
