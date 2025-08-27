/* @refresh skip */
import { CreditList } from "~/components/display/credit"
import { SongCreditStatics } from "~/domain/song"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

export function SongInfoCredit() {
	const ctx = assertContext(SongInfoPageContext)

	return (
		<ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
			<CreditList
				credits={
					// This tab will hidden if credits is undefined or empty
					SongCreditStatics.groupByArtist(ctx.song.credits!).toSorted((a, b) =>
						a.artist.name.localeCompare(b.artist.name),
					)
				}
			/>
		</ul>
	)
}
