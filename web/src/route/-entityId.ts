import * as v from "valibot"

import { EntityId_fromStr } from "~/domain/shared"

export function loadEntityId({ params }: { params: { id: string } }) {
	const result = EntityId_fromStr(params.id)
	if (!result.success) throw new v.ValiError(result.issues)
	return { entityId: result.output }
}
