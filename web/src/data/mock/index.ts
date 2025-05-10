import baka from "~/components/avatar/baka.jpg"
import { type UserContext } from "~/state/user"

export const USER_CIRNO = {
  name: "Cirno",
  avatar_url: baka,
}

export const USER_CTX: UserContext = {
  notifications: [],
  user: {
    name: "Cirno",
    avatar_url: baka,
  },
}
