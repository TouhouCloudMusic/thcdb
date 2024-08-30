import e from "@touhouclouddb/database"
import { type NonArrayType } from "@touhouclouddb/database/reflection.js"

type AcceptedType = string
export function fromArray(array: AcceptedType[], type: NonArrayType) {
	return e.array_unpack(e.literal(e.array(type), array))
}
