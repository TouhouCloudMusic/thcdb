import { useLingui } from "@lingui/solid/macro"
import type { Release } from "@thc/api"
import { For, Show } from "solid-js"
import { twJoin } from "tailwind-merge"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { imgUrl } from "~/utils/adapter/static_file"
import { displayReleaseDate } from "~/view/Homepage/utils"

type ReleaseCardProps = {
	release: Release
}

const RELEASE_CARD_OVERLAY_CLASS =
	"pointer-events-none absolute inset-0 bg-slate-700/5 opacity-0 transition-opacity duration-150 group-hover/release:opacity-100 group-focus-within/release:opacity-100 motion-reduce:transition-none"

export function ReleaseCard(props: ReleaseCardProps) {
	const { t } = useLingui()
	const artists = () => props.release.artists?.slice(0, 3) ?? []
	const releaseDate = () => displayReleaseDate(props.release.release_date)
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<Card class="group/release relative flex aspect-[1/1.309] flex-col overflow-hidden rounded-none p-0 shadow-none">
			<Link
				to="/release/$id"
				params={{ id: props.release.id.toString() }}
				aria-label={props.release.title}
				underline={false}
				class="shrink-0"
			>
				<Show
					when={coverUrl()}
					fallback={
						<div
							aria-hidden="true"
							class={twJoin(
								"aspect-square",
								props.release.id % 2 === 0 ? "bg-slate-200" : "bg-slate-100",
							)}
						></div>
					}
				>
					{(src) => (
						<img
							src={src()}
							alt=""
							loading="lazy"
							class="aspect-square w-full bg-slate-100 object-cover"
						/>
					)}
				</Show>
			</Link>

			<div class="grid min-h-0 flex-1 grid-rows-2 p-1">
				<div class="flex min-w-0 items-baseline justify-between gap-2">
					<Link
						to="/release/$id"
						params={{ id: props.release.id.toString() }}
						class="min-w-0 flex-1 truncate text-lg font-light tracking-normal text-primary"
					>
						{props.release.title}
					</Link>
					<Show when={releaseDate()}>
						{(date) => (
							<span class="shrink-0 text-xs font-light text-tertiary">
								{date()}
							</span>
						)}
					</Show>
				</div>

				<div class="flex min-w-0 items-baseline justify-between gap-3 self-end">
					<div class="min-w-0 flex-1 truncate text-sm font-light tracking-normal text-reimu-600">
						<Show
							when={artists().length > 0}
							fallback={t`Unknown artist`}
						>
							<For each={artists()}>
								{(artist, index) => (
									<>
										<Show when={index() > 0}> · </Show>
										<Link
											to="/artist/$id"
											params={{ id: artist.id.toString() }}
											title={artist.name}
											class="text-reimu-600"
										>
											{artist.name}
										</Link>
									</>
								)}
							</For>
						</Show>
					</div>
					<span class="shrink-0 text-sm font-light tracking-normal text-secondary">
						{props.release.release_type}
					</span>
				</div>
			</div>

			<div
				aria-hidden="true"
				class={RELEASE_CARD_OVERLAY_CLASS}
			></div>
		</Card>
	)
}
