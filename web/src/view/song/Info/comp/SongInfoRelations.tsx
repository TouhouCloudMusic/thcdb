import type { SongRelation } from "@thc/api"
import { createMemo, Show } from "solid-js"

import { Link } from "~/component/atomic"

import { toSongInfoRelationItemData } from "./SongInfoRelations.data"

type SongInfoRelationItemProps = {
	relation: SongRelation
}

function SongInfoRelationItem(props: SongInfoRelationItemProps) {
	const relation = createMemo(() => toSongInfoRelationItemData(props.relation))

	return (
		<li class="flex flex-col gap-1 not-first:border-t border-slate-300 not-first:pt-3">
			<div class="flex gap-3 items-center">
				<Link
					to="/song/$id"
					params={{ id: relation().songId }}
				>
					{relation().songTitle}
				</Link>
				<span class="rounded-full bg-secondary border border-slate-300 px-2 py-0.5 text-xs text-secondary">
					{relation().relationTypeName}
				</span>
			</div>
			<div class="flex min-w-0 flex-col gap-1">
				<Show when={relation().artist}>
					{(artist) => (
						<Link
							to="/artist/$id"
							params={{ id: artist().id }}
							class="text-sm font-light text-secondary"
						>
							{artist().name}
						</Link>
					)}
				</Show>
			</div>
			<Show when={relation().description}>
				{(desc) => (
					<p class="text-sm text-tertiary whitespace-pre-wrap">{desc()}</p>
				)}
			</Show>
		</li>
	)
}

type SongInfoRelationsProps = {
	relations: SongRelation[]
}

export function SongInfoRelations(props: SongInfoRelationsProps) {
	return (
		<div class="mt-4 px-4">
			<ul class="flex w-full flex-col gap-3">
				{props.relations.map((relation) => (
					<SongInfoRelationItem relation={relation} />
				))}
			</ul>
		</div>
	)
}
