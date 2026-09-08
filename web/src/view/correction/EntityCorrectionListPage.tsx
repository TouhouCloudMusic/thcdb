import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import { Link } from "@tanstack/solid-router"
import { CorrectionQueryOption } from "@thc/query"

import { PageLayout } from "~/layout/PageLayout"
import { link } from "~/style/link"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { CorrectionHistorySection } from "./CorrectionHistorySection"
import { ENTITY_LABEL_MAP, ENTITY_PAGE_ROUTE_MAP } from "./entityMap"
import type { EntityDetailType } from "./entityMap"

const styles = stylex.create({
	pageLayout: {
		paddingTop: px[32],
		paddingRight: px[32],
		paddingBottom: px[32],
		paddingLeft: px[32],
	},
	root: { display: "flex", flexDirection: "column", gap: px[24] },
	header: {
		display: "flex",
		flexDirection: "column",
		flexWrap: "wrap",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: px[8],
	},
	description: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
	},
	title: {
		fontSize: fontSizes["2xl"],
		lineHeight: lineHeights["2xl"],
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	actions: {
		display: "flex",
		gap: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
})

type EntityCorrectionListPageProps = {
	entityType: EntityDetailType
	entityId: number
	entityName: string
}

export function EntityCorrectionListPage(props: EntityCorrectionListPageProps) {
	const detailRoute = () => ENTITY_PAGE_ROUTE_MAP[props.entityType].detail
	const editRoute = () => ENTITY_PAGE_ROUTE_MAP[props.entityType].edit
	const entityLabel = () => ENTITY_LABEL_MAP[props.entityType]
	const historyQuery = useQuery(() =>
		CorrectionQueryOption.history(props.entityType, props.entityId),
	)

	return (
		<PageLayout styles={styles.pageLayout}>
			<div {...stylex.attrs(styles.root)}>
				<header {...stylex.attrs(styles.header)}>
					<p {...stylex.attrs(styles.description)}>
						{entityLabel()} correction history
					</p>
					<h1 {...stylex.attrs(styles.title)}>{props.entityName}</h1>
					<div {...stylex.attrs(styles.actions)}>
						<Link
							class={stylex.attrs(link.base, link.text).class}
							to={detailRoute()}
							params={{ id: props.entityId.toString() }}
						>
							Back to {entityLabel()}
						</Link>
						<Link
							class={stylex.attrs(link.base, link.text).class}
							to={editRoute()}
							params={{ id: props.entityId.toString() }}
						>
							Update
						</Link>
					</div>
				</header>
				<CorrectionHistorySection items={historyQuery.data ?? []} />
			</div>
		</PageLayout>
	)
}
