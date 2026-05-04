import { Trans } from "@lingui/solid/macro"
import { useQuery } from "@tanstack/solid-query"
import { createFileRoute, notFound } from "@tanstack/solid-router"
import { Show } from "solid-js"

import { EntityId_fromStr } from "~/domain/shared"
import { findCreditRoleByIdOptions } from "~/hey-api/@tanstack/solid-query.gen"
import { PageLayout } from "~/layout/PageLayout"
import { QUERY_CLIENT } from "~/state/tanstack"

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
				<PageLayout class="p-8">
					<main class="space-y-6">
						<header class="space-y-2">
							<h1 class="text-2xl font-light tracking-tight text-primary">
								{role().name}
							</h1>
							<p class="text-sm text-tertiary">
								<Trans>Credit role</Trans>
							</p>
						</header>

						<section class="space-y-2 text-sm text-secondary">
							<p>{role().short_description}</p>
							<p class="whitespace-pre-wrap">{role().description}</p>
						</section>
					</main>
				</PageLayout>
			)}
		</Show>
	)
}
