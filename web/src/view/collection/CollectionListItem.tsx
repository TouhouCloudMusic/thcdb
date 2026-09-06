import { useLingui } from "@lingui/solid/macro"
import { Show } from "solid-js"

import { Link } from "~/component/atomic"
import type { UserCollection } from "~/hey-api"

export function CollectionListItem(props: { collection: UserCollection }) {
	const { t } = useLingui()

	return (
		<div>
			<Link
				to="/collection/$id"
				params={{ id: props.collection.id.toString() }}
				class="block wrap-break-word text-base no-underline"
			>
				{props.collection.name}
			</Link>

			<div class="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-tertiary">
				<span class="flex gap-x-1">
					<span>{t`By`}</span>
					<Link
						to="/profile/$username"
						params={{ username: props.collection.owner.name }}
						class="text-secondary no-underline"
					>
						{props.collection.owner.name}
					</Link>
				</span>
				<span>
					{props.collection.item_count}{" "}
					{props.collection.item_count === 1 ? t`item` : t`items`}
				</span>
			</div>

			<Show when={props.collection.description}>
				{(description) => (
					<p class="mt-1 wrap-break-word text-sm text-tertiary">
						{description()}
					</p>
				)}
			</Show>
		</div>
	)
}
