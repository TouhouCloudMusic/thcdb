import * as stylex from "@stylexjs/stylex"
/* @refresh skip */
import { Show } from "solid-js"

import { ReleaseCoverWall } from "~/component/display/release/ReleaseCoverWall"
import { px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"

import { SongInfoPageContext } from ".."

const styles = stylex.create({
	releases: {
		marginTop: px[16],
		display: "grid",
		gridTemplateColumns: {
			default: "repeat(2, minmax(0, 1fr))",
			"@media (min-width: 40rem)": "repeat(3, minmax(0, 1fr))",
			"@media (min-width: 48rem)": "repeat(4, minmax(0, 1fr))",
			"@media (min-width: 64rem)": "repeat(6, minmax(0, 1fr))",
			"@media (min-width: 80rem)": "repeat(8, minmax(0, 1fr))",
		},
		gap: px[16],
	},
})

export function SongInfoRelease() {
	const ctx = assertContext(SongInfoPageContext)
	return (
		<Show when={ctx.song.releases}>
			{(releases) => (
				<div {...stylex.attrs(styles.releases)}>
					<ReleaseCoverWall releases={releases()} />
				</div>
			)}
		</Show>
	)
}
