import { redirect } from "@solidjs/router"
import e from "@touhouclouddb/database"
import { client } from "~/database/edgedb"

async function find(id: bigint | number) {
	"use server"
	const idStr = id.toString()
	return await e
		.select(e.default.Artist, (artist) => ({
			...artist["*"],
			alias: {
				...e.default.Artist.alias["*"],
			},
			members: {
				...e.default.Artist.members["*"],
			},
			member_of: {
				...e.default.Artist.member_of["*"],
			},
			filter_single: {
				app_id: e.int64(idStr),
			},
		}))
		.run(client)
}

export async function getData(id: bigint | number) {
	"use server"
	try {
		return await find(id)
	} catch (error) {
		// TODO: 研究如何把error发到客户端上
		console.log(e)
		throw redirect("/500")
	}
}
