import { useLingui } from "@lingui/solid/macro"

type PlaylistCardProps = {
	playlist: {
		id: number
		title: string
		coverUrl: string
		creator: string
	}
}

export function PlaylistCard(props: PlaylistCardProps) {
	const { t } = useLingui()
	return (
		<div class="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md">
			<div class="aspect-square overflow-hidden">
				<img
					src={props.playlist.coverUrl}
					alt={props.playlist.title}
					class="h-full w-full object-cover transition-transform hover:scale-105"
				/>
			</div>
			<div class="p-3">
				<h3 class="hover:text-rose-600 line-clamp-2 text-sm font-medium text-primary">
					{props.playlist.title}
				</h3>
				<p class="mt-1 text-xs text-tertiary">
					{t`by`} {props.playlist.creator}
				</p>
			</div>
		</div>
	)
}
