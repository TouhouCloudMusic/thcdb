import { numeric } from "./type"

export function toNumericStr(num: numeric) {
	switch (typeof num) {
		case "number":
			return num.toString()
		case "bigint":
			return num.toString()
		default:
			return BigInt(num).toString()
	}
}
