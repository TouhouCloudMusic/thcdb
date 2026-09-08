import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import { Link } from "@tanstack/solid-router"
import type { CorrectionHistoryItem } from "@thc/api"
import { CorrectionQueryOption } from "@thc/query"
import { pipe } from "@thc/toolkit"
import { ArrExt } from "@thc/toolkit/data"
import { untrack } from "solid-js"

import { buttonStyles } from "~/component/atomic/button"
import { link } from "~/style/link"
import { px } from "~/style/tokens.stylex"

import { EntityContributors } from "./EntityContributors"
import { ENTITY_PAGE_ROUTE_MAP } from "./entityMap"
import type { EntityDetailType } from "./entityMap"

const styles = stylex.create({
	root: {
		display: "flex",
		flexDirection: "column",
		gap: px[8],
		paddingTop: 0,
		paddingRight: 0,
		paddingBottom: 0,
		paddingLeft: 0,
	},
	actions: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "center",
		gap: px[4],
	},
})

const linkStyles = [
	buttonStyles.base,
	buttonStyles.outline,
	buttonStyles.gray,
	buttonStyles.sm,
]

type EntityCorrectionMetadataSectionProps = {
	entityType: EntityDetailType
	entityId: number
	correctionHistory?: CorrectionHistoryItem[]
}

export function EntityCorrectionMetadataSection(
	props: EntityCorrectionMetadataSectionProps,
) {
	const { t } = useLingui()
	const providedCorrectionHistory = untrack(() => props.correctionHistory)
	const correctionHistoryQuery = providedCorrectionHistory
		? undefined
		: useQuery(() =>
				CorrectionQueryOption.history(props.entityType, props.entityId),
			)
	const correctionsRoute = () =>
		ENTITY_PAGE_ROUTE_MAP[props.entityType].corrections
	const editRoute = () => ENTITY_PAGE_ROUTE_MAP[props.entityType].edit
	const entityLabel = () => {
		switch (props.entityType) {
			case "artist": {
				return t`Artist`
			}
			case "label": {
				return t`Label`
			}
			case "release": {
				return t`Release`
			}
			case "song": {
				return t`Song`
			}
			case "tag": {
				return t`Tag`
			}
			case "event": {
				return t`Event`
			}
		}
	}
	const correctionHistory = () =>
		providedCorrectionHistory ?? correctionHistoryQuery?.data ?? []

	return (
		<div {...stylex.attrs(styles.root)}>
			<EntityContributors
				contributors={pipe(
					correctionHistory(),
					ArrExt.mapOrDefault((item) => item.author),
					ArrExt.dedupeByKey("id"),
				)}
			/>
			{/* TODO: Improve button style */}
			<div {...stylex.attrs(styles.actions)}>
				<Link
					to={correctionsRoute()}
					params={{ id: props.entityId.toString() }}
					class={stylex.attrs(link.base, linkStyles).class}
				>
					<Trans>Corrections · {correctionHistory().length}</Trans>
				</Link>
				<Link
					to={editRoute()}
					params={{ id: props.entityId.toString() }}
					class={stylex.attrs(link.base, linkStyles).class}
				>
					{t`Update ${entityLabel()}`}
				</Link>
			</div>
		</div>
	)
}
