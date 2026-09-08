import { createEffect } from "solid-js"
import type { Accessor } from "solid-js"

import { recordVisit } from "~/hey-api"
import type { RecordVisitData } from "~/hey-api"

export function createEntityVisit(
	entityType: RecordVisitData["path"]["entity_type"],
	entityId: Accessor<number | undefined>,
) {
	const visited = new Set<number>()

	createEffect(() => {
		const id = entityId()
		if (id === undefined || visited.has(id)) return

		visited.add(id)
		void recordVisit({ path: { entity_type: entityType, id } }).catch(
			() => undefined,
		)
	})
}
