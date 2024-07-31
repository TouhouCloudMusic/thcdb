import { SolidServerAuth } from "edge-auth-solid-start/server"
import { createClient } from "edgedb"

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"

export const edgedbClient = createClient({
	instanceName: process.env.EDGEDB_INSTANCE_NAME,
	branch: "main",
	tlsSecurity: "insecure",
})

export const serverAuthHelper = new SolidServerAuth(edgedbClient, {
	baseUrl: "http://localhost:3000",
})

const actions = serverAuthHelper.createServerActions()
export const { signout } = actions
