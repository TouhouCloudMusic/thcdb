import * as a11yAddonAnnotations from "@storybook/addon-a11y/preview"
import { setProjectAnnotations } from "storybook-solidjs-vite"

await import("../src/test/vitest.setup")
const { default: previewAnnotations } = await import("./preview")

// This is an important step to apply the right configuration when testing your stories.
// More info at: https://storybook.js.org/docs/api/portable-stories/portable-stories-vitest#setprojectannotations
// @ts-expect-error Storybook annotation types are currently incompatible here.
setProjectAnnotations([a11yAddonAnnotations, previewAnnotations])
