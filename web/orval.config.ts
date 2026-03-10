import { defineConfig } from "orval"

const DEFAULT_SERVER_PORT = "12346"
const serverPort = process.env["SERVER_PORT"] ?? DEFAULT_SERVER_PORT

export default defineConfig({
	petstore: {
		input: `http://localhost:${serverPort}/openapi.json`,
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
