export function padZero(num: number, length: number) {
	return num.toString().padStart(length, "0")
}
