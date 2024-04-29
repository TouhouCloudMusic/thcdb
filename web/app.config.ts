import { defineConfig } from "@solidjs/start/config";
export default defineConfig({
	vite: {
		resolve: {
			alias: {
				pages: "/src/pages",
			},
		},
	},
});
