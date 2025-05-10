import { FetchClient, type UserProfile } from ".."

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
		throw res.error.message
	} else if (res.response.status === 404) {
		return undefined
	} else {
		throw Error("Unknown error")
	}
}
