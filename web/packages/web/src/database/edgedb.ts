import createAuth from "edge-auth-solid-start/server"
import * as edgedb from "edgedb"

export const client = edgedb.createClient({
	instanceName: process.env.EDGEDB_INSTANCE_NAME,
	...(import.meta.env.DEV ? { tlsSecurity: "insecure" } : {}),
})

export const auth = createAuth(client, {
	baseUrl: process.env.APP_BASE_URL,
})
