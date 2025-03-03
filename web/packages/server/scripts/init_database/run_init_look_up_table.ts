import db from "./connection"
import { initLookupTable } from "./init_lookup_table"

await initLookupTable(db)
process.exit(0)
