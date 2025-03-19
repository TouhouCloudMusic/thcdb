import fs from "fs/promises"
import openApiGen, { astToString } from "openapi-typescript"
import { CONFIG } from "~/config"

let api_doc_url = new URL("openapi.json", CONFIG.server_base_url)

// Make sure server is running
let json = (await fetch(api_doc_url).then((res) => res.json())) as string

let ast = await openApiGen(json)
let schema = astToString(ast)

await fs.writeFile("./src/query/openapi.ts", schema, "utf8")
