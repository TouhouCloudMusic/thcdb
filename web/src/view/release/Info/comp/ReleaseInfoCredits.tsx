import { Link } from "@tanstack/solid-router"
import type { CreditRoleRef, Release, SimpleArtist } from "@thc/api"
import { For, Show } from "solid-js"

// Compact grouped list; no global divider to keep dense layout
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

export function ReleaseInfoCredits() {
	const ctx = assertContext(ReleaseInfoPageContext)

	let grouped = () =>
		groupByArtist(ctx.release.credits ?? []).toSorted((a, b) =>
			a.artist.name.localeCompare(b.artist.name),
		)

	return (
		<Show when={grouped().length > 0}>
			<ul class="grid grid-cols-1 gap-x-8 lg:grid-cols-2">
				<For each={grouped()}>{(g) => <GroupedCreditItem group={g} />}</For>
			</ul>
		</Show>
	)
}

// Types and grouping (scoped to this view)
type ReleaseCredit = NonNullable<Release["credits"]>[number]
type GroupedReleaseCredit = {
	artist: SimpleArtist
	items: { role: CreditRoleRef; on?: number[] | null | undefined }[]
}

function groupByArtist(credits: ReleaseCredit[]): GroupedReleaseCredit[] {
	return credits.reduce<GroupedReleaseCredit[]>((ret, credit) => {
		let existing = ret.find((g) => g.artist.id === credit.artist.id)
		if (existing) {
			existing.items.push({ role: credit.role, on: credit.on })
		} else {
			ret.push({
				artist: credit.artist,
				items: [{ role: credit.role, on: credit.on }],
			})
		}
		return ret
	}, [])
}

function GroupedCreditItem(props: { group: GroupedReleaseCredit }) {
	return (
		<li class="py-2">
			<div>
				<Link
					to="/artist/$id"
					params={{ id: props.group.artist.id.toString() }}
					class="text-primary underline-offset-4 transition-colors hover:underline"
				>
					{props.group.artist.name}
				</Link>
			</div>
			<ul class="mt-1 space-y-0.5 text-sm leading-relaxed tracking-wider text-tertiary">
				<For each={props.group.items}>
					{(item) => (
						<li>
							<span>{item.role.name}</span>
							<Show when={item.on && item.on.length > 0}>
								<span class="text-xs whitespace-pre">: </span>
								<span class="text-xs">{item.on!.join(", ")}</span>
							</Show>
						</li>
					)}
				</For>
			</ul>
		</li>
	)
}
