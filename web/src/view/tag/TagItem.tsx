import { StackIcon } from "@thc/icons/radix"
import { For, Show } from "solid-js"

import { Link } from "~/component/atomic"
import type { TagListItem } from "~/hey-api"

export function TagItem(props: { tag: TagListItem }) {
	return (
		<div>
			<div class="flex flex-wrap items-baseline gap-x-1 gap-y-1">
				<Link
					to="/tag/$id"
					params={{ id: props.tag.id.toString() }}
					class="wrap-break-word text-base no-underline"
				>
					{props.tag.name}
				</Link>
				<Show when={props.tag.parents.length > 0}>
					<div class="flex min-w-0 items-baseline text-sm text-tertiary">
						<span class="flex aspect-square h-lh shrink-0 items-center justify-center self-start">
							<StackIcon aria-hidden="true" />
						</span>
						<div class="min-w-0 wrap-break-word">
							<For each={props.tag.parents}>
								{(parent, index) => (
									<>
										<Link
											to="/tag/$id"
											params={{ id: parent.id.toString() }}
											class="text-tertiary no-underline"
										>
											{parent.name}
										</Link>
										<Show when={index() < props.tag.parents.length - 1}>
											{" / "}
										</Show>
									</>
								)}
							</For>
						</div>
					</div>
				</Show>
			</div>

			<Show when={props.tag.short_description}>
				{(description) => (
					<p class="wrap-break-word text-sm text-tertiary">{description()}</p>
				)}
			</Show>
		</div>
	)
}
