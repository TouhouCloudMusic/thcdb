/* @refresh skip */
import { Image } from "~/component/image"
import { imgUrl } from "~/utils/adapter/static_file"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

// TODO:
// - Image src
// - Better fallback
//
export function SongInfoCoverImage() {
	const context = assertContext(SongInfoPageContext)
	const coverUrl = () => imgUrl(context.song.releases?.[0]?.cover_art_url)
	return (
		<Image.Root>
			<div class="isolate aspect-square w-full overflow-hidden bg-slate-100 sm:max-w-64">
				<Image.Fallback>
					{(state) =>
						state != Image.State.Ok && (
							<div class="size-full bg-slate-100"></div>
						)
					}
				</Image.Fallback>
				<Image.Img
					src={coverUrl()}
					class="size-full object-cover"
				/>
			</div>
		</Image.Root>
	)
}
