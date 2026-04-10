import { Image } from "~/component/image"
import { imgUrl } from "~/utils/adapter/static_file"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoPageContext } from "../context"

export function ReleaseInfoCoverImage() {
	const ctx = assertContext(ReleaseInfoPageContext)
	const coverUrl = () => imgUrl(ctx.release.cover_art_url)

	return (
		<Image.Root>
			<div class="isolate size-64 overflow-hidden bg-secondary">
				<Image.Fallback>
					{(state) => (
						<div class="flex size-full items-center justify-center bg-slate-100">
							{state !== Image.State.Loading && (
								<span class="text-sm text-slate-500">No cover art</span>
							)}
						</div>
					)}
				</Image.Fallback>
				<Image.Img
					src={coverUrl()}
					alt={ctx.release.title}
					class="size-full object-cover"
				/>
			</div>
		</Image.Root>
	)
}
