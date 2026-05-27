import { useLingui } from "@lingui/solid/macro"
import type { ComponentProps } from "solid-js"
import { Show } from "solid-js"

import { Button } from "~/component/atomic/button"

export function CollectionLoadMore(props: {
	when: boolean
	isLoading: boolean
	onLoadMore: () => void
	variant?: ComponentProps<typeof Button>["variant"]
}) {
	const { t } = useLingui()

	return (
		<Show when={props.when}>
			<Button
				variant={props.variant ?? "SecondaryV2"}
				size="Sm"
				disabled={props.isLoading}
				onClick={props.onLoadMore}
			>
				{props.isLoading ? t`Loading...` : t`Load more`}
			</Button>
		</Show>
	)
}
