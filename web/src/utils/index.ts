export function sleep(sec: number) {
	return new Promise((res) => setTimeout(res, sec))
}
