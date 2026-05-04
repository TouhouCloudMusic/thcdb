import { createFileRoute } from "@tanstack/solid-router"
import { CorrectionQueryOption } from "@thc/query"
import * as v from "valibot"

import { EntityId_fromStr } from "~/domain/shared"
import { QUERY_CLIENT } from "~/state/tanstack"
import { CorrectionDetailPage } from "~/view/correction/Detail"

const searchSchema = v.object({
	compare: v.fallback(v.optional(v.number()), undefined),
})

export const Route = createFileRoute("/correction/$id")({
	component: RouteComponent,
	validateSearch: searchSchema,
	loaderDeps: ({ search }) => ({
		compareId: search.compare,
	}),
	loader: async ({ params, deps }) => {
		const parsedId = EntityId_fromStr(params.id)

		await QUERY_CLIENT.ensureQueryData(CorrectionQueryOption.detail(parsedId))

		const compareId = deps.compareId
		await QUERY_CLIENT.ensureQueryData(
			compareId && compareId !== parsedId
				? CorrectionQueryOption.compare(compareId, parsedId)
				: CorrectionQueryOption.diff(parsedId),
		)
	},
})

function RouteComponent() {
	const params = Route.useParams()
	const search = Route.useSearch()
	const navigate = Route.useNavigate()
	const correctionId = EntityId_fromStr(params().id)

	return (
		<CorrectionDetailPage
			correctionId={correctionId}
			compareId={search().compare}
			onCompareIdChange={(value) =>
				void navigate({
					search: (prev) => ({
						...prev,
						compare: value,
					}),
				})
			}
		/>
	)
}
