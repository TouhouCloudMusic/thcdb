import { useLingui } from "@lingui/solid/macro"
import { Show, Suspense } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Tab } from "~/component/atomic/Tab"

export type EntityCommentsTabTriggerProps = {
	count?: number
	class?: string
}

export function EntityCommentsTabTrigger(props: EntityCommentsTabTriggerProps) {
	const { t } = useLingui()

	return (
		<Tab.Trigger
			value="Comments"
			class={twMerge("flex items-center gap-2", props.class)}
		>
			<span>{t`Comments`}</span>
			<Suspense>
				<Show when={props.count !== undefined}>
					<span class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-secondary">
						{props.count}
					</span>
				</Show>
			</Suspense>
		</Tab.Trigger>
	)
}
