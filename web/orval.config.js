import { defineConfig } from "orval"

/** @type {import("orval").Options} */
export const api = {
	input: "./tmp/openapi.json",
	output: {
		target: "src/orval",
		mode: "tags",
		client: "solid-query",
		baseUrl: "/api",
		prettier: true,
		clean: true,
		mock: true,
	},
}

export default defineConfig({
	api,
})
