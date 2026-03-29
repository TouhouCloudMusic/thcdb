import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import type { PluginOption } from "vite"
import babelMacrosPlugin from "vite-plugin-babel-macros"
import solidPlugin from "vite-plugin-solid"
import { wuchale } from "wuchale/vite"

function compactPlugins(
	plugins: (PluginOption | false | null | undefined)[],
): PluginOption[] {
	return plugins.filter((plugin): plugin is PluginOption => {
		return plugin !== false && plugin !== null && plugin !== undefined
	})
}

export function createAppPlugins(options: {
	withWuchale: boolean
}): PluginOption[] {
	return compactPlugins([
		devtools(),
		options.withWuchale && wuchale(),
		tanstackRouter({
			target: "solid",
			autoCodeSplitting: true,
			routesDirectory: "src/route",
		}),
		babelMacrosPlugin(),
		solidPlugin(),
		tailwindcss(),
	])
}
