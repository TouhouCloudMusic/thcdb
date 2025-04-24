import type { SetStoreFunction } from "solid-js/store"
import { createProvider } from "~/utils/createProvider"

import type { UserPageData } from "./user"

type UserDataStore = ReturnType<typeof createUserDataStore>

const createUserDataStore = (
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
  UserDataStore
>(createUserDataStore)
