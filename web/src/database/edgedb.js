import * as edgedb from "edgedb"

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0"

const client = edgedb.createClient({
	instanceName: "thcdb",
	tlsSecurity: "insecure",
})

async function test() {
	const res = await client.query(`
		Select Release {
			title
		}
		`)
	return res
}

console.log(await test())
