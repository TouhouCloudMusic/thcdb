import { defineConfig, loadEnv } from "vite"

import { createAppPlugins } from "./vite.shared"

const isHttps = (url: string | undefined) => {
	if (!url) {
		return false
	}

	return new URL(url).protocol == "https:"
}

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd())

	const SERVER_URL = env["VITE_SERVER_URL"]

	return {
		plugins: createAppPlugins(),
		experimental: {
			bundledDev: true,
		},
		server: {
			port: 3000,
			host: "127.0.0.1",
			strictPort: true,
			proxy: {
				"/api": {
					target: SERVER_URL,
					changeOrigin: true,
					secure: isHttps(SERVER_URL),
					rewrite: (url) => url.replace(/^\/api/u, ""),
				},
			},
			forwardConsole: true,
		},
		resolve: {
			tsconfigPaths: true,
		},
		build: {
			target: "esnext",
			rolldownOptions: {
				experimental: {
					lazyBarrel: true,
				},
			},
		},
	}
})
