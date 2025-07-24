import { For } from "solid-js"

import { Image } from "~/components/image"

export type ReleaseCoverWallProps = {
	releases: ReleaseCoverWallRelease[]
}

type ReleaseCoverWallRelease = {
	id: number
	title: string
	cover_art_url?: string | null | undefined
}

export function ReleaseCoverWall(props: ReleaseCoverWallProps) {
	return (
		<For each={props.releases}>
			{(release) => (
				<div class="flex flex-col gap-2">
					<div class="aspect-square overflow-hidden">
						<Image.Root>
							<Image.Img
								src={release.cover_art_url ?? undefined}
								alt={release.title}
								class="h-full w-full object-cover"
							/>
							<Image.Fallback>
								{(state) =>
									state !== Image.State.Ok && (
										// TODO: Better fallback
										<div class="flex h-full w-full items-center justify-center bg-gray-200">
											<span class="text-sm text-gray-500">No Cover Art</span>
										</div>
									)
								}
							</Image.Fallback>
						</Image.Root>
					</div>
					<div class="text-center">
						{/* TODO: Release Link */}
						<p class="line-clamp-2 text-sm text-primary underline-offset-4 hover:underline">
							{release.title}
						</p>
					</div>
				</div>
			)}
		</For>
	)
}
