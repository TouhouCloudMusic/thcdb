import fs from "fs/promises"
import { Plugin } from "vite"

export const GenerateCounstantsPlugin = (base_url?: string): Plugin => ({
  name: "generate-constants",
  async buildStart() {
    if (!base_url) {
      console.log(
        "SERVER_BASE_URL is not defined, skipping constants generation",
      )
      return
    }
    try {
      const response = await fetch(`${base_url}/constant.ts`)
      const content = await response.text()

      await fs.writeFile("src/constants/server.ts", content)
      console.log("Constants file generated successfully")
    } catch (error) {
      console.error("Failed to generate constants file:", error)
    }
  },
})
