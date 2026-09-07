import { useLingui } from "@lingui/solid/macro"
import { Show } from "solid-js"

import { Button } from "~/component/atomic/button"

export function CollectionLoadMore(props: {
	when: boolean
	isLoading: boolean
	onLoadMore: () => void
	appearance?: "outline" | "soft"
}) {
	const { t } = useLingui()

	return (
		<Show when={props.when}>
			<Button
				disabled={props.isLoading}
				onClick={props.onLoadMore}
				appearance={props.appearance ?? "outline"}
				tone="gray"
				size="sm"
			>
				{props.isLoading ? t`Loading...` : t`Load more`}
			</Button>
		</Show>
	)
}
