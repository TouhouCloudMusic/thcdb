"use server"
import e from "@touhouclouddb/database"
import { serverAuthHelper } from "../server"

export async function getCurrentUser() {
	"use server"
	const client = serverAuthHelper.getSession().client
	return await e
		.select(e.User, () => ({
			filter_single: {
				id: e.global.current_user.id,
			},
			...e.User["*"],
			identity: {
				...e.ext.auth.Identity["*"],
			},
		}))
		.run(client)
}
