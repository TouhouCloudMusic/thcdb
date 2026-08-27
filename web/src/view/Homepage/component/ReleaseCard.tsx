import { useLingui } from "@lingui/solid/macro"
import type { Release } from "@thc/api"
import { For, Show } from "solid-js"
import { twJoin } from "tailwind-merge"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { tw } from "~/utils"
import { imgUrl } from "~/utils/adapter/static_file"
import { displayReleaseDate } from "~/view/Homepage/utils"

const RELEASE_CARD_CLASS = tw(`
	flex flex-col overflow-hidden rounded-none p-0 shadow-none
	sm:aspect-[1/1.309]
`)

const RELEASE_CARD_CONTENT_CLASS = "grid min-h-0 flex-1 grid-rows-2 p-1"

export function ReleaseCardSkeleton() {
	return (
		<Card
			class={twJoin(
				RELEASE_CARD_CLASS,
				"animate-pulse motion-reduce:animate-none",
			)}
		>
			<div class="aspect-square w-full shrink-0 bg-slate-100"></div>
			<div class={RELEASE_CARD_CONTENT_CLASS}>
				<div class="flex items-center justify-between gap-2">
					<div class="h-5 w-3/4 rounded bg-slate-200"></div>
					<div class="h-3 w-10 rounded bg-slate-100"></div>
				</div>

				<div class="flex items-center justify-between gap-3 self-end">
					<div class="h-3 w-1/2 rounded bg-slate-100"></div>
					<div class="h-3 w-12 rounded bg-slate-100"></div>
				</div>
			</div>
		</Card>
	)
}

const RELEASE_CARD_OVERLAY_CLASS =
	"pointer-events-none absolute inset-0 bg-slate-700/5 opacity-0 transition-opacity duration-150 group-hover/release:opacity-100 group-focus-within/release:opacity-100 motion-reduce:transition-none"

type ReleaseCardProps = {
	release: Release
}

export function ReleaseCard(props: ReleaseCardProps) {
	const { t } = useLingui()
	const artists = () => props.release.artists?.slice(0, 3) ?? []
	const releaseDate = () => displayReleaseDate(props.release.release_date)
	const coverUrl = () => imgUrl(props.release.cover_art_url)

	return (
		<Card class={twJoin(RELEASE_CARD_CLASS, "group/release relative")}>
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

			<div class={RELEASE_CARD_CONTENT_CLASS}>
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
