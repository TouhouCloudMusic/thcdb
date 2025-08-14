/// <reference types="vitest/config" />
import { lingui as linguiSolidPlugin } from "@lingui-solid/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import { defineConfig, loadEnv } from "vite"
import babelMacrosPlugin from "vite-plugin-babel-macros"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"

import { generatePlugin } from "./plugins/generate"

// oxlint-disable-next-line no-default-export
export default defineConfig(({ mode }) => {
	// oxlint-disable-next-line no-undef
	const env = loadEnv(mode, process.cwd())
	// oxlint-disable-next-line no-undef
	const isTest = !!process.env["VITEST"]
	const SERVER_URL =
		env["VITE_SERVER_URL"] ?? (isTest ? "http://localhost:9999" : undefined)

	if (!SERVER_URL && !isTest) {
		throw new Error("Environment variable `VITE_SERVER_URL` is not defined")
	}
	return {
		plugins: [
			babelMacrosPlugin(),
			linguiSolidPlugin(),
			solidPlugin(),
			tanstackRouter({ target: "solid" }),
			tailwindcss(),

			tsconfigPaths(),
			...(isTest ? [] : [generatePlugin(SERVER_URL)]),
		],
		server: {
			port: 3000,
			proxy: {
				"/api": {
					target: SERVER_URL,
					changeOrigin: true,
					secure: false,
					rewrite: (path) => path.replace(/^\/api/, ""),
				},
			},
		},
		build: {
			target: "esnext",
		},
		test: {
			projects: ["packages/*", "."],
		},
	}
})
