import { Show } from "solid-js"

import { CreditList } from "~/component/display/credit"
import { SongCreditStatics } from "~/domain/song"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

export function SongInfoCredit() {
	const ctx = assertContext(SongInfoPageContext)
	const groupedCredits = () =>
		SongCreditStatics.groupByArtist(ctx.song.credits ?? []).toSorted((a, b) =>
			a.artist.name.localeCompare(b.artist.name),
		)

	return (
		<Show when={groupedCredits().length > 0}>
			<ul class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
				<CreditList credits={groupedCredits()} />
			</ul>
		</Show>
	)
}
