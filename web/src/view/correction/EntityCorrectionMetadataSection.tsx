import { Trans, useLingui } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import type { CorrectionHistoryItem } from "@thc/api"
import { CorrectionQueryOption } from "@thc/query"
import { pipe } from "@thc/toolkit"
import { ArrExt } from "@thc/toolkit/data"
import { untrack } from "solid-js"
import type { JSX } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Link } from "~/component/atomic/Link"
import { ButtonClass_new } from "~/component/atomic/button"

import { EntityContributors } from "./EntityContributors"
import { ENTITY_PAGE_ROUTE_MAP } from "./entityMap"
import type { EntityDetailType } from "./entityMap"

const LINK_CLASS = twMerge(
	ButtonClass_new({
		variant: "SecondaryV2",
		size: "Sm",
	}),
)

type EntityCorrectionMetadataSectionProps = {
	entityType: EntityDetailType
	entityId: number
	correctionHistory?: CorrectionHistoryItem[]
	trailingAction?: JSX.Element
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
		<div class="flex flex-col gap-2 p-0 pb-0">
			<EntityContributors
				contributors={pipe(
					correctionHistory(),
					ArrExt.mapOrDefault((item) => item.author),
					ArrExt.dedupeByKey("id"),
				)}
			/>
			{/* TODO: Improve button style */}
			<div class="flex w-fit items-center gap-1">
				<Link
					to={correctionsRoute()}
					params={{ id: props.entityId.toString() }}
					class={LINK_CLASS}
					underline={false}
				>
					<Trans>Corrections · {correctionHistory().length}</Trans>
				</Link>
				<Link
					to={editRoute()}
					params={{ id: props.entityId.toString() }}
					class={LINK_CLASS}
					underline={false}
				>
					{t`Update ${entityLabel()}`}
				</Link>
				{props.trailingAction}
			</div>
		</div>
	)
}
