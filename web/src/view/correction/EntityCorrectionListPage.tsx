import { useQuery } from "@tanstack/solid-query"
import { CorrectionQueryOption } from "@thc/query"

import { Link } from "~/component/atomic/Link"
import { PageLayout } from "~/layout/PageLayout"

import { CorrectionHistorySection } from "./CorrectionHistorySection"
import { ENTITY_LABEL_MAP, ENTITY_PAGE_ROUTE_MAP } from "./entityMap"
import type { EntityDetailType } from "./entityMap"

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
		<PageLayout class="p-8">
			<div class="flex flex-col gap-6">
				<header class="flex flex-col flex-wrap items-start justify-between gap-2">
					<p class="text-sm text-tertiary">
						{entityLabel()} correction history
					</p>
					<h1 class="text-2xl font-light tracking-tight text-primary">
						{props.entityName}
					</h1>
					<div class="flex gap-2 text-sm">
						<Link
							to={detailRoute()}
							params={{ id: props.entityId.toString() }}
						>
							Back to {entityLabel()}
						</Link>
						<Link
							to={editRoute()}
							params={{ id: props.entityId.toString() }}
						>
							Update
						</Link>
					</div>
				</header>
				<CorrectionHistorySection
					items={historyQuery.data ?? []}
				/>
			</div>
		</PageLayout>
	)
}
