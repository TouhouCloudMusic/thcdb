/// <reference types="@solidjs/start/env" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EDGEDB_INSTANCE_NAME: string
      AUTH_SECRET: string
      AUTH_EDGEDB_DSN: string
      AUTH_GITHUB_ID: string
      AUTH_GITHUB_SECRET: string
      APP_BASE_URL: string
    }
  }
}
export {}
