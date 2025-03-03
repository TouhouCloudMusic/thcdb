declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DB_HOST: string
      DB_USER: string
      DB_PASSWORD: string
      DB_NAME: string
      PORT: string
      IMAGE_PATH: string
    }
  }
}
export {}
