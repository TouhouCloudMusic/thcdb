import { useLingui } from "@lingui/solid/macro"
import type { CorrectionHistoryItem } from "@thc/api"
import { For, Suspense } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Link } from "~/component/atomic/Link"
import { ButtonClass_new } from "~/component/atomic/button"
import { formatTimestamp } from "~/utils/dateTime"

type CorrectionHistoryItemProps = {
	item: CorrectionHistoryItem
	isCurrent: boolean
	previousId?: number
}

function CorrectionHistoryItemEntry(props: CorrectionHistoryItemProps) {
	const { t } = useLingui()
	return (
		<li
			class={twMerge(
				"border border-slate-300 bg-primary",
				props.isCurrent && "border-blue-300 ring-1 ring-blue-200",
			)}
		>
			<div class="flex flex-wrap items-start gap-3 bg-secondary px-3 py-2 border-b border-slate-300">
				<div class="self-center font-mono text-xs text-tertiary">
					#{props.item.id}
				</div>

				<div class="h-full self-center ml-auto text-xs text-tertiary">
					{formatTimestamp(
						props.item.handled_at ?? props.item.created_at,
						t`None`,
					)}
				</div>
				<Link
					to="/correction/$id"
					params={{ id: props.item.id.toString() }}
					search={{ compare: props.previousId }}
					underline={false}
					class={twMerge(
						ButtonClass_new({
							size: "Sm",
							variant: "SecondaryV2",
						}),
						"shadow-none px-2 font-normal text-xs",
					)}
				>
					View diff
				</Link>
			</div>
			{/* Table content */}
			<div class="grid grid-cols-[auto_1fr] p-2 gap-2">
				<For
					each={[
						[
							t`Author`,
							<Link
								to={"/profile/$username"}
								params={{
									username: props.item.author.name,
								}}
								class="text-blue-700"
							>
								{props.item.author.name}
							</Link>,
						],
						[t`Description`, props.item.description],
					]}
				>
					{(item) => (
						<>
							<div class="text-tertiary">{item[0]}</div>
							<div>{item[1]}</div>
						</>
					)}
				</For>
			</div>
		</li>
	)
}

type CorrectionHistorySectionProps = {
	currentCorrectionId?: number
	items?: CorrectionHistoryItem[]
	class?: string
}

export function CorrectionHistorySection(props: CorrectionHistorySectionProps) {
	const { t } = useLingui()
	return (
		<section class={twMerge("space-y-2", props.class)}>
			<Suspense
				fallback={<div class="text-sm text-tertiary">{t`Loading...`}</div>}
			>
				<ul class="divide-y divide-slate-200 overflow-hidden bg-primary">
					<For
						each={props.items}
						fallback={
							<li class="px-4 py-3 text-sm text-tertiary">
								No corrections yet.
							</li>
						}
					>
						{(item, index) => (
							<CorrectionHistoryItemEntry
								item={item}
								isCurrent={item.id === props.currentCorrectionId}
								previousId={props.items?.[index() + 1]?.id}
							/>
						)}
					</For>
				</ul>
			</Suspense>
		</section>
	)
}
