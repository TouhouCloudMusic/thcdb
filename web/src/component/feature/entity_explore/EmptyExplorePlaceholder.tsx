import { Trans } from "@lingui/solid/macro"
import { Show } from "solid-js"

import { Link } from "~/component/atomic"
import type { LinkProps } from "~/component/atomic/Link"

type Action = {
	to: LinkProps["to"]
	label?: string
}

type Props = {
	title: string
	description?: string
	action?: Action
}

export function EmptyExplorePlaceholder(props: Props) {
	return (
		<section class="px-4 py-10">
			<div class="mx-auto flex max-w-md flex-col items-center text-center">
				<h2 class="text-base text-slate-900">{props.title}</h2>

				<Show
					when={props.description}
					fallback={
						<Show when={props.action}>
							{(action) => (
								<p class="mt-1 text-sm text-secondary">
									<Trans>
										Try adjusting the filters, or{" "}
										<Link
											to={action().to}
											class="underline"
										>
											create
										</Link>{" "}
										the first one.
									</Trans>
								</p>
							)}
						</Show>
					}
				>
					{(text) => <p class="mt-1 text-sm text-secondary">{text()}</p>}
				</Show>

				<Show when={props.action}>
					{(action) => (
						<Show when={props.description && action().label}>
							<Link
								to={action().to}
								class="mt-1 text-sm font-light text-tertiary "
							>
								{action().label}
							</Link>
						</Show>
					)}
				</Show>
			</div>
		</section>
	)
}
