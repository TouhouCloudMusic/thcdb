import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"

import type { GroupedSongCredit } from "~/domain/song"

export function CreditList(props: { credits: GroupedSongCredit[] }) {
	return (
		<For each={props.credits}>
			{(credit) => (
				<li class="group relative mx-2 border-b border-slate-300 px-2 py-6">
					<div class="grid grid-cols-[1fr_auto] items-baseline gap-8">
						<div class="text-left">
							<Link
								to={"/artist/$id"}
								params={{
									id: credit.artist.id.toString(),
								}}
								class="inline-block text-sm tracking-wider text-primary underline-offset-4 transition-colors hover:underline"
							>
								{credit.artist.name}
							</Link>
						</div>

						<ul class="space-y-1 text-right text-sm leading-relaxed tracking-wider text-tertiary underline-offset-4 *:hover:underline">
							{/* TODO: Role link */}
							<For each={credit.roles}>{(role) => <li>{role.name}</li>}</For>
						</ul>
					</div>
				</li>
			)}
		</For>
	)
}
