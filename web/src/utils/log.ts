export function logImage(url: string, size = 1) {
	const img = new Image()
	img.src = url
	img.onload = () => {
		const style = [
			"font-size: 1px;",
			`padding: ${(img.height / 2) * size}px ${(img.width / 2) * size}px;`,
			`background: url(${url}) no-repeat;`,
			"background-size: contain;",
			"line-height: 0;",
		].join(" ")

		console.log("%c", style)
	}
}

export function dbg(...args: unknown[]) {
	if (import.meta.env.DEV) {
		// oxlint-disable-next-line no-console
		console.log(...args)
	}
}
