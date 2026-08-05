import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import type { PluginOption } from "vite"
import solidPlugin from "vite-plugin-solid"

function compactPlugins(
	plugins: (PluginOption | false | null | undefined)[],
): PluginOption[] {
	return plugins.filter((plugin): plugin is PluginOption => {
		return plugin !== false && plugin !== null && plugin !== undefined
	})
}

export function createSharedPlugins(): PluginOption[] {
	return compactPlugins([
		lingui(),
		babel({
			presets: [linguiTransformerBabelPreset()],
		}),
		solidPlugin(),
		tailwindcss(),
	])
}

export function createAppPlugins(): PluginOption[] {
	return compactPlugins([
		devtools(),
		tanstackRouter({
			target: "solid",
			autoCodeSplitting: true,
			routesDirectory: "src/route",
		}),
		...createSharedPlugins(),
	])
}
