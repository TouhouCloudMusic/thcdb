import { lingui as linguiSolidPlugin } from "@lingui-solid/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { TanStackRouterVite } from "@tanstack/router-plugin/vite"
import { defineConfig } from "vite"
import { loadEnv } from "vite"
import babelMacrosPlugin from "vite-plugin-babel-macros"
import solidPlugin from "vite-plugin-solid"
import tsconfigPaths from "vite-tsconfig-paths"

import { generatePlugin } from "./plugins/generate"

export default defineConfig(({ mode }) => {
	const SERVER_URL = loadEnv(mode, process.cwd())["VITE_SERVER_URL"]

	if (!SERVER_URL) {
		throw new Error("Environment variable `VITE_SERVER_URL` is not defined")
	}
	return {
		plugins: [
			babelMacrosPlugin(),
			linguiSolidPlugin(),
			solidPlugin(),
			TanStackRouterVite({ target: "solid", autoCodeSplitting: true }),
			tailwindcss(),

			tsconfigPaths(),
			generatePlugin(SERVER_URL),
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
	}
})
