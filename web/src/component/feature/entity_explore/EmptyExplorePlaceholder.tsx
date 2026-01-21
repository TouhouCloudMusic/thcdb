import type { Component } from "solid-js"
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

export const EmptyExplorePlaceholder: Component<Props> = (props) => {
	return (
		<section class="rounded-md border border-dashed border-slate-300 bg-slate-50 px-6 py-10">
			<div class="mx-auto flex max-w-md flex-col items-center text-center">
				<div class="grid size-12 place-items-center rounded-full bg-white shadow-xs ring-1 ring-slate-200">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						class="size-5 text-slate-500"
						aria-hidden="true"
					>
						<path
							d="M20 20L17 17M10.5 18C6.35786 18 3 14.6421 3 10.5C3 6.35786 6.35786 3 10.5 3C14.6421 3 18 6.35786 18 10.5C18 14.6421 14.6421 18 10.5 18Z"
							stroke="currentColor"
							stroke-width="1.5"
							stroke-linecap="round"
							stroke-linejoin="round"
						></path>
					</svg>
				</div>

				<h2 class="mt-4 tracking-tighter text-2xl text-primary font-light">
					{props.title}
				</h2>

				<Show
					when={props.description}
					fallback={
						<Show when={props.action}>
							{(action) => (
								<p class="mt-1 text-sm text-secondary">
									Try adjusting the filters, or{" "}
									<Link
										to={action().to}
										class="underline"
									>
										create
									</Link>{" "}
									the first one.
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
