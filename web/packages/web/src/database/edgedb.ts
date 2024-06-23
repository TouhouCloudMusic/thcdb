import * as edgedb from "edgedb"

// process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"

export const client = edgedb.createClient({
	instanceName: "thcdb",
	tlsSecurity: "insecure",
})
