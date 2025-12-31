import { createFileRoute } from "@tanstack/solid-router"
import { CorrectionQueryOption } from "@thc/query"
import * as v from "valibot"

import { EntityId } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { CorrectionDetailPage } from "~/view/correction/Detail"

const searchSchema = v.object({
	compare: v.optional(v.number()),
})

export const Route = createFileRoute("/correction/$id")({
	component: RouteComponent,
	validateSearch: searchSchema,
	loader: async ({ params, search }) => {
		const parsedId = v.parse(EntityId, Number.parseInt(params.id, 10))

		await QUERY_CLIENT.ensureQueryData(CorrectionQueryOption.detail(parsedId))

		const compareId = search.compare
		await QUERY_CLIENT.ensureQueryData(
			compareId && compareId !== parsedId
				? CorrectionQueryOption.compare(compareId, parsedId)
				: CorrectionQueryOption.diff(parsedId),
		)

		await QUERY_CLIENT.ensureQueryData(
			CorrectionQueryOption.revisions(parsedId),
		)
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const search = Route.useSearch()
	const correctionId = v.parse(EntityId, Number.parseInt(params().id, 10))

	return (
		<CorrectionDetailPage
			correctionId={correctionId}
			compareId={search().compare}
		/>
	)
}
