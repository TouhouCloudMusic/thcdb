import type { Artist } from "@thc/api"
import { Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { imgUrl } from "~/utils/adapter/static_file"

type ArtistCardProps = {
	artist: Artist
}

const ARTIST_CARD_OVERLAY_CLASS =
	"pointer-events-none absolute inset-0 bg-slate-700/5 opacity-0 transition-opacity duration-150 group-hover/artist:opacity-100 group-focus-within/artist:opacity-100 motion-reduce:transition-none"

export function ArtistCard(props: ArtistCardProps) {
	const avatarUrl = () => imgUrl(props.artist.profile_image_url)
	const initials = () => props.artist.name.trim().slice(0, 1).toUpperCase()
	const artistHrefParams = () => ({ id: props.artist.id.toString() })
	const country = () =>
		props.artist.current_location?.country
		?? props.artist.start_location?.country

	return (
		<Card class="group/artist relative flex flex-col rounded-none p-3 shadow-none">
			<Link
				to="/artist/$id"
				params={artistHrefParams()}
				underline={false}
				class="rounded-full bg-slate-100"
			>
				<Show
					when={avatarUrl()}
					fallback={
						<div class="grid aspect-square w-full place-items-center text-base font-light tracking-normal text-secondary">
							{initials()}
						</div>
					}
				>
					{(src) => (
						<img
							src={src()}
							alt=""
							loading="lazy"
							class="aspect-square w-full rounded-full bg-slate-100 object-cover"
						/>
					)}
				</Show>
			</Link>

			<div class="flex flex-1 flex-col justify-between gap-1 pt-2">
				<Link
					to="/artist/$id"
					params={artistHrefParams()}
					title={props.artist.name}
					class="truncate text-sm font-light tracking-normal text-primary"
				>
					{props.artist.name}
				</Link>
				<Show when={country()}>
					{(value) => (
						<div class="truncate text-xs font-light text-tertiary">
							{value()}
						</div>
					)}
				</Show>
			</div>

			<div
				aria-hidden="true"
				class={ARTIST_CARD_OVERLAY_CLASS}
			></div>
		</Card>
	)
}
