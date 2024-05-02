import { defineConfig } from "@solidjs/start/config";
import viteConfigPaths from "vite-tsconfig-paths";
import path from "path";
export default defineConfig({
	vite: {
		build: {
			minify: false
		},
		plugins: [viteConfigPaths()]
	}
});
