import { useQuery } from "@tanstack/solid-query"
import { CorrectionQueryOption } from "@thc/query"
import { pipe } from "@thc/toolkit"
import { ArrExt } from "@thc/toolkit/data"
import type { JSX } from "solid-js"
import { Suspense } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Link } from "~/component/atomic/Link"
import { ButtonClass_new } from "~/component/atomic/button"

import { EntityContributors } from "./EntityContributors"
import { ENTITY_LABEL_MAP, ENTITY_PAGE_ROUTE_MAP } from "./entityMap"
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
	trailingAction?: JSX.Element
}

export function EntityCorrectionMetadataSection(
	props: EntityCorrectionMetadataSectionProps,
) {
	const historyQuery = useQuery(() =>
		CorrectionQueryOption.history(props.entityType, props.entityId),
	)

	const correctionsRoute = () =>
		ENTITY_PAGE_ROUTE_MAP[props.entityType].corrections
	const editRoute = () => ENTITY_PAGE_ROUTE_MAP[props.entityType].edit
	const entityLabel = () => ENTITY_LABEL_MAP[props.entityType]

	return (
		<div class="flex flex-col gap-2 p-0 pb-0">
			<EntityContributors
				contributors={pipe(
					historyQuery.data,
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
					Corrections ·{" "}
					<Suspense fallback={<>...</>}>
						{historyQuery.data?.length ?? 0}
					</Suspense>
				</Link>
				<Link
					to={editRoute()}
					params={{ id: props.entityId.toString() }}
					class={LINK_CLASS}
					underline={false}
				>
					Update {entityLabel()}
				</Link>
				{props.trailingAction}
			</div>
		</div>
	)
}
