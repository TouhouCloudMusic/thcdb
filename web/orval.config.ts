import { defineConfig } from "orval"

// oxlint-disable-next-line import/no-default-export
export default defineConfig({
	petstore: {
		input: "http://localhost:12345/openapi.json",
		output: {
			target: "src/orval",
			mode: "tags",
			client: "solid-query",
			prettier: true,
			clean: true,
			mock: true,
		},
	},
})
