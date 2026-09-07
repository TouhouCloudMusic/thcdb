import { Trans } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import { Link, createFileRoute, notFound } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { findSongLyricsByIdOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout/PageLayout"
import { QUERY_CLIENT } from "~/state/tanstack"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	subtitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	lyrics: {
		whiteSpace: "pre-wrap",
		fontSize: fontSizes.sm,
		lineHeight: "1.5rem",
		color: colors.textSecondary,
	},
	contentChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[24] },
	},
	page: { padding: px[32] },
	headerChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
})

export const Route = createFileRoute("/song-lyrics/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const id = EntityId_fromStr(params.id)
		const data = await QUERY_CLIENT.ensureQueryData(
			findSongLyricsByIdOptions({ path: { id } }),
		)
		if (data.data === null) {
			throw notFound()
		}
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const id = () => EntityId_fromStr(params().id)
	const query = useQuery(() =>
		findSongLyricsByIdOptions({ path: { id: id() } }),
	)

	return (
		<Show when={query.data?.data}>
			{(lyrics) => (
				<PageLayout styles={styles.page}>
					<main>
						<header {...stylex.attrs(styles.contentChild)}>
							<h1 {...stylex.attrs(styles.title, styles.headerChild)}>
								<Trans>Song lyrics</Trans>
							</h1>
							<p {...stylex.attrs(styles.subtitle, styles.headerChild)}>
								<Link
									class={stylex.attrs(link.base, link.text).class}
									to="/song/$id"
									params={{ id: lyrics().song_id.toString() }}
								>
									<Trans>Song</Trans>
								</Link>
								{" · "}
								{lyrics().language.name}
							</p>
						</header>

						<pre {...stylex.attrs(styles.lyrics, styles.contentChild)}>
							{lyrics().content}
						</pre>
					</main>
				</PageLayout>
			)}
		</Show>
	)
}
