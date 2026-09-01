import { useLingui } from "@lingui/solid/macro"
import type { HomeMetadata } from "@thc/api"
import { For } from "solid-js"

import { formatCount } from "~/view/Homepage/utils"

function HomeStatsGrid(props: { metadata?: HomeMetadata }) {
	const { t } = useLingui()
	const stats = () =>
		[
			{ key: "releases_count", label: t`Releases` },
			{ key: "songs_count", label: t`Songs` },
			{ key: "artists_count", label: t`Artists` },
			{ key: "tags_count", label: t`Tags` },
		] satisfies { key: keyof HomeMetadata; label: string }[]

	return (
		<div
			class="grid w-full grid-cols-2 gap-x-8 gap-y-6
				md:w-fit md:grid-cols-4 md:gap-x-16"
		>
			<For each={stats()}>
				{(stat) => (
					<div class="md:min-w-28">
						<div class="text-3xl font-extralight tracking-tight text-primary tabular-nums">
							{formatCount(props.metadata?.[stat.key])}
						</div>
						<div class="mt-1 text-xs font-light tracking-widest text-tertiary uppercase">
							{stat.label}
						</div>
					</div>
				)}
			</For>
		</div>
	)
}

export function HomeStats(props: { metadata?: HomeMetadata }) {
	const { t } = useLingui()
	return (
		<section
			aria-label={t`Database statistics`}
			class="border-b border-slate-300 bg-primary px-4 py-3 sm:px-6 lg:px-8"
		>
			<HomeStatsGrid metadata={props.metadata} />
		</section>
	)
}
