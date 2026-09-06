import { For, Show } from "solid-js"

import { Link } from "~/component/atomic"
import type { LabelListItem } from "~/hey-api"

export function LabelItem(props: { label: LabelListItem }) {
	const foundedYear = () => props.label.founded_date?.value.slice(0, 4)

	return (
		<div class="min-w-0">
			<Link
				to="/label/$id"
				params={{ id: props.label.id.toString() }}
				class="wrap-break-word text-base no-underline decoration-slate-300 underline-offset-2"
			>
				{props.label.name}
			</Link>

			<div class="mt-1 wrap-break-word text-sm text-tertiary">
				<Show when={foundedYear()}>
					{(year) => (
						<>
							<span>{year()}</span>
							<Show when={props.label.founders.length > 0}>{" · "}</Show>
						</>
					)}
				</Show>
				<For each={props.label.founders}>
					{(founder, index) => (
						<>
							<Link
								to="/artist/$id"
								params={{ id: founder.id.toString() }}
								class="text-tertiary no-underline"
							>
								{founder.name}
							</Link>
							<Show when={index() < props.label.founders.length - 1}>
								{", "}
							</Show>
						</>
					)}
				</For>
			</div>
		</div>
	)
}
