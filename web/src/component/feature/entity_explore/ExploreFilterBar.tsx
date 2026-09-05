import type { JSX, ParentProps } from "solid-js"
import { children, Show } from "solid-js"

type ExploreFilterBarProps = ParentProps<{
	actions?: JSX.Element
}>

export function ExploreFilterBar(props: ExploreFilterBarProps) {
	const actions = children(() => props.actions)

	return (
		<div class="@container border-y border-slate-100 py-4">
			<div class="grid min-w-0 grid-cols-1 items-end gap-4 @[21rem]:grid-cols-2 @[33rem]:grid-cols-1 @[33rem]:items-baseline">
				<div class="contents min-w-0 flex-wrap items-baseline gap-4 @[33rem]:flex [&>*]:max-w-full">
					{props.children}
				</div>

				<Show when={actions()}>
					{(content) => (
						<div class="justify-self-end contain-layout @[21rem]:col-start-2">
							{content()}
						</div>
					)}
				</Show>
			</div>
		</div>
	)
}
