import { Show } from "solid-js"

import { Thumbnail } from "~/component/Thumbnail"
import { Link } from "~/component/atomic"
import type { ArtistListItem } from "~/hey-api"
import { imgUrl } from "~/utils/adapter/static_file"

import { ArtistTypeLabel } from "./ArtistTypeLabel"

export function ArtistItem(props: { artist: ArtistListItem }) {
	const location = () =>
		[
			props.artist.current_location.city,
			props.artist.current_location.province,
			props.artist.current_location.country,
		]
			.filter(Boolean)
			.join(", ")

	return (
		<div class="grid grid-cols-[3lh_minmax(0,1fr)] items-start gap-3 leading-6">
			<Thumbnail
				src={imgUrl(props.artist.profile_image_url)}
				to="/artist/$id"
				params={{ id: props.artist.id.toString() }}
				aria-label={props.artist.name}
				class="relative aspect-square overflow-hidden rounded-full no-underline focus-visible:ring-2"
				imageClass="absolute inset-0 size-full object-cover"
			/>

			<div class="flex flex-col justify-between gap-2 self-stretch">
				<div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
					<Link
						to="/artist/$id"
						params={{ id: props.artist.id.toString() }}
						class="wrap-break-word text-base no-underline decoration-slate-300 underline-offset-2"
					>
						{props.artist.name}
					</Link>
					<span class="text-sm text-tertiary">
						<ArtistTypeLabel value={props.artist.artist_type} />
					</span>
				</div>
				<Show when={location()}>
					{(value) => <div class="text-sm text-tertiary">{value()}</div>}
				</Show>
			</div>
		</div>
	)
}
