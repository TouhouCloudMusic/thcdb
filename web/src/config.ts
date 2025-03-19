const SERVER_URL = "localhost"
const SERVER_PORT = 12345
export const CONFIG = {
  get server_base_url() {
    return `http://${SERVER_URL}:${SERVER_PORT}`
  },
}
