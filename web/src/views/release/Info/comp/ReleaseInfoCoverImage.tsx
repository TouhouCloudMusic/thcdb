import { Image } from "~/components/image"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

export function ReleaseInfoCoverImage() {
	const ctx = assertContext(ReleaseInfoPageContext)

	return (
		<Image.Root>
			<div class="isolate size-64 overflow-hidden bg-secondary">
				<Image.Fallback>
					{(state) => (
						<div class="flex size-full items-center justify-center bg-slate-100">
							{state !== Image.State.Loading && (
								<span class="text-sm text-slate-500">No Cover Art</span>
							)}
						</div>
					)}
				</Image.Fallback>
				<Image.Img
					src={ctx.release.cover_art_url ?? undefined}
					alt={ctx.release.title}
					class="size-full object-cover"
				/>
			</div>
		</Image.Root>
	)
}
