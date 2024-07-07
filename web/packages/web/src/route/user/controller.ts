import { createProvider } from "~/util/createProvider"
import { UserPageData } from "./user"
import { SetStoreFunction } from "solid-js/store"

type UserDataController = ReturnType<typeof createUserDataController>

const createUserDataController = (
	data: UserPageData,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	setData: SetStoreFunction<UserPageData>
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
