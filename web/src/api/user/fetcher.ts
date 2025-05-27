// oxlint-disable-next-line no-cycle
import { FetchClient } from ".."
import type { UserProfile } from "./index"

export type Option = {
	"params.username"?: string | undefined
	current_user?: UserProfile | undefined
}

export async function userProfile({
	"params.username": params_username,
}: Option) {
	let res = await (params_username ?
		FetchClient.GET(`/profile/{name}`, {
			params: {
				path: {
					name: params_username,
				},
			},
		})
	:	FetchClient.GET(`/profile`))

	if (res.data) {
		return res.data.data
	} else if (res.error) {
		throw new Error(res.error.message)
		// oxlint-disable-next-line no-magic-numbers
	} else if (res.response.status === 404) {
		return
	} else {
		throw new Error("Unknown error")
	}
}
