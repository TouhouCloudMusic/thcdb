import { useLingui } from "@lingui/solid/macro"
import { Show } from "solid-js"

import { ExternalLinks } from "~/component/data/ExternalLinks"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

export function ReleaseInfoDetails() {
	const { t } = useLingui()
	const ctx = assertContext(ReleaseInfoPageContext)

	return (
		<div class="contents text-sm">
			<div class="text-tertiary">{t`Type`}</div>
			<div>{ctx.release.release_type}</div>
			<Show when={ctx.release.release_date}>
				<span class="text-tertiary">{t`Released`}</span>
				<span class="text-slate-900">
					{DateWithPrecision.display(ctx.release.release_date)}
				</span>
			</Show>

			<Show
				when={
					ctx.release.recording_date_start ?? ctx.release.recording_date_end
				}
			>
				<span class="text-tertiary">{t`Recorded`}</span>
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
				<span class="text-tertiary">{t`Catalog Nums`}</span>
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

			<ExternalLinks
				links={ctx.release.links}
				class="contents"
				labelClass="text-tertiary"
			/>
		</div>
	)
}
