import { defineConfig } from "drizzle-kit"

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_HOST: string
      DB_USER: string
      DB_PASSWORD: string
      DB_NAME: string
    }
  }
}

export default defineConfig({
  schema: ["./src/database/schema/index.ts"],
  out: "./drizzle",
  dialect: "postgresql", // 'postgresql' | 'mysql' | 'sqlite'
  dbCredentials: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },
})
