let text = `
--color-slate-100: #f3f4f5;
	--color-slate-200: #e8eaed;
	--color-slate-300: #d5d7db;
	--color-slate-400: #c0c3c8;
	--color-slate-500: #a0a4ab;
	--color-slate-600: #7c8088;
	--color-slate-700: #595c64;
	--color-slate-800: #3a3d44;
	--color-slate-900: #1b1e25;

	/* reimu */
	--color-reimu-100: #fff0ef;
	--color-reimu-200: #fce1df;
	--color-reimu-300: #ffcac6;
	--color-reimu-400: #ff9e99;
	--color-reimu-500: #f87572;
	--color-reimu-600: #db464c;
	--color-reimu-700: #a82f33;
	--color-reimu-800: #6f1c1b;
	--color-reimu-900: #3d0c07;

	/* blue */
	--color-blue-100: #edf4ff;
	--color-blue-200: #deeaff;
	--color-blue-300: #c4d9fd;
	--color-blue-400: #96baff;
	--color-blue-500: #719cfb;
	--color-blue-600: #4e76e2;
	--color-blue-700: #2755c7;
	--color-blue-800: #06328c;
	--color-blue-900: #011446;

	/* marisa */
	--color-marisa-100: #fbf3d1;
	--color-marisa-200: #f7eab8;
	--color-marisa-300: #edd698;
	--color-marisa-400: #d9b468;
	--color-marisa-500: #c79c49;
	--color-marisa-600: #a57911;
	--color-marisa-700: #845d11;
	--color-marisa-800: #553a07;
	--color-marisa-900: #261803;

	/* green */
	--color-green-100: #dcfce6;
	--color-green-200: #c0f6d2;
	--color-green-300: #92eaad;
	--color-green-400: #62cf7d;
	--color-green-500: #2fb459;
	--color-green-600: #00903a;
	--color-green-700: #006b28;
	--color-green-800: #004616;
	--color-green-900: #002206;
`

let map = text
	.split("\n")
	.filter((x) => x.includes("--"))
	.map((x) => x.trim())
	.reduce((map, x) => {
		const regex = /--color-([a-zA-Z]+)-(\d+):\s*(#[0-9a-fA-F]{3,6})/
		const match = x.match(regex)

		if (!match) {
			throw new Error(`Invalid color format: ${x}`)
		}

		const color = match[1]!
		const number = parseInt(match[2]!)
		const hex = match[3]!
		if (!map.has(color)) map.set(color, [])
		map.get(color)![number / 100 - 1] = hex
		return map
	}, new Map<string, string[]>())

let result = Array.from(map.entries()).map(([color, colors]) => ({
	name: color,
	colors,
}))

console.log(result)
