import fs from "node:fs/promises"
import type { Plugin } from "vite"

export const generatePlugin = (
	base_url?: string,
	isTest?: boolean,
): Plugin => ({
	name: "generate",
	async buildStart() {
		if (isTest) {
			return
		}
		if (!base_url) {
			console.log("base_url is not defined, skipping constants generation")
			return
		}
		try {
			await generateConstants(base_url)
			console.log("File generated successfully")
		} catch (error) {
			let msg

			if (error instanceof Error) {
				msg = error.stack
			} else {
				msg = error
			}
			console.error("Failed to generate file:", msg)
		}
	},
})

async function generateConstants(base_url: string) {
	let url = new URL("constant.ts", base_url)
	let response = await fetch(url)
	if (!response.ok) {
		throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
	}

	const content = await response.text()

	return fs.writeFile("src/constant/server.ts", content)
}
