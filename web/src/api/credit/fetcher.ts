import { FetchClient } from ".."
import type { OpenApiSchema } from ".."
import { handleApiResponse } from "../utils"

export async function __findByKeyword(
	keyword: string,
): Promise<OpenApiSchema["CreditRoleSummary"][]> {
	const res = await FetchClient.GET("/credit-role/summary", {
		params: {
			query: { keyword },
		},
	})
	return handleApiResponse(res)
}

export async function __findById(
	id: number,
): Promise<OpenApiSchema["CreditRole"] | null> {
	const res = await FetchClient.GET("/credit-role/{id}", {
		params: {
			path: { id },
		},
	})
	return handleApiResponse(res)
}
