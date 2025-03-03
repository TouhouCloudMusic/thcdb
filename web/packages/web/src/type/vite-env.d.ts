/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PUB_EDGEDB_INSTANCE_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
