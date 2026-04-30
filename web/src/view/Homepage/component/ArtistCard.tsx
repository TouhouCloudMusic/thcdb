import { useLingui } from "@lingui/solid/macro"
import type { Artist } from "@thc/api"
import { Show } from "solid-js"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { imgUrl } from "~/utils/adapter/static_file"

type ArtistCardProps = {
	artist: Artist
}

export function ArtistCard(props: ArtistCardProps) {
	const avatarUrl = () => imgUrl(props.artist.profile_image_url)
	const initials = () => props.artist.name.trim().slice(0, 1).toUpperCase()
	const artistHrefParams = () => ({ id: props.artist.id.toString() })

	return (
		<Card class="group flex h-full flex-col gap-3 rounded-none border border-slate-300 bg-white p-3 shadow-none transition-colors duration-150 hover:border-slate-400 hover:bg-slate-50 motion-reduce:transition-none">
			<Link
				to="/artist/$id"
				params={artistHrefParams()}
				class="block w-full overflow-hidden rounded-full border border-slate-200 bg-slate-100 no-underline hover:no-underline"
			>
				<Show
					when={avatarUrl()}
					fallback={
						<div class="grid aspect-square w-full place-items-center rounded-full text-sm font-medium tracking-wide text-secondary">
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

			<div class="flex w-full flex-col gap-1">
				<Link
					to="/artist/$id"
					params={artistHrefParams()}
					class="text-sm font-medium leading-snug [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
				>
					{props.artist.name}
				</Link>
				<div class="flex items-center gap-1.5 text-[10px] text-tertiary">
					<span
						class="h-1 w-1 shrink-0 rounded-full bg-slate-300"
						aria-hidden="true"
					></span>
					<span class="truncate">
						<ArtistTypeText artistType={props.artist.artist_type} />
					</span>
				</div>
			</div>
		</Card>
	)
}

function ArtistTypeText(props: { artistType: Artist["artist_type"] }) {
	const { t } = useLingui()

	const label = () => {
		if (props.artistType === "Solo") return t`Solo artist`
		if (props.artistType === "Multiple") return t`Group`
		return t`Artist`
	}

	return <>{label()}</>
}
