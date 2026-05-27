import { useLingui } from "@lingui/solid/macro"

import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import type { UserCollection } from "~/hey-api"

export function FollowedCollectionRow(props: { item: UserCollection }) {
	const { t } = useLingui()

	return (
		<li>
			<Link
				to="/collection/$id"
				params={{ id: props.item.id.toString() }}
				underline={false}
				class="group grid gap-3 px-1 py-4 no-underline outline-none transition-colors hover:bg-slate-50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-3"
			>
				<div class="min-w-0">
					<div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
						<h3 class="truncate text-[15px] font-medium text-slate-900 transition-colors group-hover:text-sky-700">
							{props.item.name}
						</h3>
						<span class="inline-flex min-w-0 items-center gap-1.5 text-xs font-medium text-slate-600">
							<Avatar
								user={{
									name: props.item.owner.name,
									avatar_url: props.item.owner.avatar_url,
								}}
								class="size-4 shrink-0 [&>div]:text-xs [&>div]:leading-none"
							/>
							<span class="truncate">{props.item.owner.name}</span>
						</span>
					</div>
					<p class="mt-1 line-clamp-1 text-sm text-slate-500">
						{props.item.description || t`No description`}
					</p>
				</div>

				<div class="flex items-center gap-4 text-xs text-slate-500 sm:justify-end">
					<span class="tabular-nums">
						{props.item.item_count}{" "}
						{props.item.item_count === 1 ? t`item` : t`items`}
					</span>
					<span class="text-slate-300 transition-colors group-hover:text-slate-500">
						&gt;
					</span>
				</div>
			</Link>
		</li>
	)
}
