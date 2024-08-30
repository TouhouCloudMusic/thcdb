export type SeqLikeID = bigint | number | string
export function mapSeqlikeIDtoStr(id: SeqLikeID) {
	switch (typeof id) {
		case "number":
			return id.toString()
		case "bigint":
			return id.toString()
		default:
			return id
	}
}
