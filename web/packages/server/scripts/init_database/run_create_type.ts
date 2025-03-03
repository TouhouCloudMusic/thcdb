import db from "./connection"
import { createCustomType } from "./create_type"

await createCustomType(db)
process.exit(0)
