import { useQuery } from "@tanstack/solid-query"
import { CorrectionQueryOption } from "@thc/query"
import { pipe } from "@thc/toolkit"
import { ArrExt } from "@thc/toolkit/data"
import { Suspense } from "solid-js"
import { twMerge } from "tailwind-merge"

import { Link } from "~/component/atomic/Link"
import { ButtonClass_new } from "~/component/atomic/button"
import { Intersperse } from "~/component/data/Intersperse"

import { ENTITY_LABEL_MAP, ENTITY_PAGE_ROUTE_MAP } from "./entityMap"
import type { EntityDetailType } from "./entityMap"

type Contributor = {
	id: number
	name: string
}

type EntityContributorsProps = {
	contributors: Contributor[]
}

function EntityContributors(props: EntityContributorsProps) {
	return (
		<div class="flex flex-wrap text-sm">
			<div class="font-medium text-tertiary whitespace-pre">Contributors: </div>
			<p class="text-primary wrap-break-word">
				<Suspense fallback={<>Loading contributors...</>}>
					<Intersperse
						of={props.contributors}
						with={<span class="whitespace-pre">, </span>}
					>
						{(contributor) => <span>{contributor.name}</span>}
					</Intersperse>
				</Suspense>
			</p>
		</div>
	)
}

const LINK_CLASS = twMerge(
	ButtonClass_new({
		variant: "Primary",
		size: "Sm",
	}),
)

type EntityCorrectionMetadataSectionProps = {
	entityType: EntityDetailType
	entityId: number
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
			<div class="grid grid-cols-2 w-fit gap-1">
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
			</div>
		</div>
	)
}
