import { defineConfig } from "orval"

export default defineConfig({
	petstore: {
		input: "http://localhost:12345/openapi.json",
		output: {
			target: "src/orval",
			mode: "tags",
			client: "solid-query",
			baseUrl: "/api",
			prettier: true,
			clean: true,
			mock: true,
		},
	},
})
