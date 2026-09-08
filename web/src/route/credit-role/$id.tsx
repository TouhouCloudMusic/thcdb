import { Trans } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { findCreditRoleByIdOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout/PageLayout"
import { QUERY_CLIENT } from "~/state/tanstack"
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
	descriptions: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	contentChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[24] },
	},
	page: { padding: px[32] },
	description: { whiteSpace: "pre-wrap" },
	headerChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
	descriptionsChild: {
		marginBlockEnd: { default: null, ":not(:last-child)": px[8] },
	},
})

export const Route = createFileRoute("/credit-role/$id")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const id = EntityId_fromStr(params.id)
		const data = await QUERY_CLIENT.ensureQueryData(
			findCreditRoleByIdOptions({ path: { id } }),
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
		findCreditRoleByIdOptions({ path: { id: id() } }),
	)

	return (
		<Show when={query.data?.data}>
			{(role) => (
				<PageLayout styles={styles.page}>
					<main>
						<header {...stylex.attrs(styles.contentChild)}>
							<h1 {...stylex.attrs(styles.title, styles.headerChild)}>
								{role().name}
							</h1>
							<p {...stylex.attrs(styles.subtitle, styles.headerChild)}>
								<Trans>Credit role</Trans>
							</p>
						</header>

						<section
							{...stylex.attrs(styles.descriptions, styles.contentChild)}
						>
							<p {...stylex.attrs(styles.descriptionsChild)}>
								{role().short_description}
							</p>
							<p
								{...stylex.attrs(styles.description, styles.descriptionsChild)}
							>
								{role().description}
							</p>
						</section>
					</main>
				</PageLayout>
			)}
		</Show>
	)
}
