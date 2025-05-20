type PlaylistCardProps = {
	playlist: {
		id: number
		title: string
		coverUrl: string
		creator: string
	}
}

export function PlaylistCard({ playlist }: PlaylistCardProps) {
	return (
		<div class="overflow-hidden rounded-lg bg-white shadow transition-shadow hover:shadow-md">
			<div class="aspect-square overflow-hidden">
				<img
					src={playlist.coverUrl}
					alt={playlist.title}
					class="h-full w-full object-cover transition-transform hover:scale-105"
				/>
			</div>
			<div class="p-3">
				<h3 class="line-clamp-2 text-sm font-medium text-gray-800 hover:text-rose-600">
					{playlist.title}
				</h3>
				<p class="mt-1 text-xs text-gray-500">
					by {playlist.creator}
				</p>
			</div>
		</div>
	)
}