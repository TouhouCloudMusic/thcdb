import type { SetStoreFunction } from "solid-js/store"
import { createProvider } from "~/utils/createProvider"

import type { UserPageData } from "./user"

type UserDataController = ReturnType<typeof createUserDataController>

const createUserDataController = (
  data: UserPageData,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setData: SetStoreFunction<UserPageData>,
) => {
  const userDataController = {
    username: () => data.username,
    timeline: () => data.timeline,
  }
  return userDataController
}

export const [UserDataProvider, useUserController] = createProvider<
  UserPageData,
  UserDataController
>(createUserDataController)
