import * as stylex from "@stylexjs/stylex"
import { Show } from "solid-js"

import { CreditList } from "~/component/display/credit"
import { SongCreditStatics } from "~/domain/song"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

const styles = stylex.create({
	credits: {
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(1, minmax(0, 1fr))",
			"@media (min-width: 48rem)": "repeat(2, minmax(0, 1fr))",
			"@media (min-width: 64rem)": "repeat(3, minmax(0, 1fr))",
		},
	},
})

export function SongInfoCredit() {
	const ctx = assertContext(SongInfoPageContext)
	const groupedCredits = () =>
		SongCreditStatics.groupByArtist(ctx.song.credits ?? []).toSorted((a, b) =>
			a.artist.name.localeCompare(b.artist.name),
		)

	return (
		<Show when={groupedCredits().length > 0}>
			<ul {...stylex.attrs(styles.credits)}>
				<CreditList credits={groupedCredits()} />
			</ul>
		</Show>
	)
}
