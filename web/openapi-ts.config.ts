import { defineConfig } from "@hey-api/openapi-ts"
import path from "node:path"

const serverUrl = process.env["VITE_SERVER_URL"]
const inputPath =
	serverUrl === undefined
		? path.join(process.cwd(), "./tmp/openapi.json")
		: path.join(serverUrl, "api/openapi.json")

export default defineConfig({
	input: inputPath,
	output: {
		path: "packages/server-sdk/src",
		postProcess: [
			{
				command: "just",
				args: ["fmt"],
			},
		],
	},
	plugins: [
		"@hey-api/typescript",
		"@tanstack/solid-query",
		{
			name: "valibot",
			case: "PascalCase",
			definitions: { name: "{{name}}Schema" },
			requests: false,
			responses: false,
			webhooks: { name: "{{name}}WebhookRequestSchema" },
		},
	],
})
