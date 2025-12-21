import { Show } from "solid-js"

import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

export function ReleaseInfoDetails() {
	const ctx = assertContext(ReleaseInfoPageContext)

	return (
		<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
			<div class="text-tertiary">Type</div>
			<div>{ctx.release.release_type}</div>
			<Show when={ctx.release.release_date}>
				<span class="text-tertiary">Released</span>
				<span class="text-slate-900">
					{DateWithPrecision.display(ctx.release.release_date)}
				</span>
			</Show>

			<Show
				when={
					ctx.release.recording_date_start || ctx.release.recording_date_end
				}
			>
				<span class="text-tertiary">Recorded</span>
				<div class="flex items-center">
					<Show when={ctx.release.recording_date_start}>
						<span>
							{DateWithPrecision.display(ctx.release.recording_date_start)}
						</span>
					</Show>
					<Show when={ctx.release.recording_date_end}>
						<span class="whitespace-pre text-tertiary"> - </span>
						<span>
							{DateWithPrecision.display(ctx.release.recording_date_end)}
						</span>
					</Show>
				</div>
			</Show>

			<Show
				when={ctx.release.catalog_nums && ctx.release.catalog_nums.length > 0}
			>
				<span class="text-tertiary">Catalog Nums</span>
				<ul class="flex items-baseline">
					<Intersperse
						of={ctx.release.catalog_nums}
						with={<span class="whitespace-pre"> / </span>}
					>
						{(catalog) => (
							<li class="bg-slate-50 rounded">{catalog.catalog_number}</li>
						)}
					</Intersperse>
				</ul>
			</Show>
		</div>
	)
}
