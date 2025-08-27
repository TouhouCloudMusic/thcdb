import type { operations } from "../../gen"
import { FetchClient } from "../../http"
import type { Opt } from "../../shared"
import { adaptApiResult, adaptApiResultOptional } from "../../shared"

export async function findCreditRoleById(
	options: Opt<"find_credit_role_by_id">,
) {
	const res = await FetchClient.GET("/credit-role/{id}", {
		params: options,
	})

	return adaptApiResultOptional(res)
}

export async function findManyCreditRolesSummary(
	options: Opt<"find_many_credit_roles_summary">,
) {
	const res = await FetchClient.GET("/credit-role/summary", {
		params: options,
	})

	return adaptApiResult(res)
}
