import * as edgedb from "edgedb"

// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"

export const client = edgedb.createClient({
	instanceName: import.meta.env.PUB_EDGEDB_INSTANCE_NAME,
	...(import.meta.env.DEV ? { tlsSecurity: "insecure" } : {}),
})
