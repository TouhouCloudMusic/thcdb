import { createProviderC } from "~/util/createProvider"
import { TimeLineItem, UserPageData } from "./user.data"
import { SetStoreFunction } from "solid-js/store"

// type UserDataController = ReturnType<typeof createUserDataController>

// const createUserDataController = (
// 	data: UserPageData,
// 	setData: SetStoreFunction<UserPageData>
// ) => {
// 	const userDataController = {
// 		username: () => data.username,
// 		timeline: () => data.timeline,
// 	}
// 	return userDataController
// }

// export const [UserDataProvider, useUserData] = createProvider<
// 	UserPageData,
// 	UserDataController
// >(createUserDataController)

// TODO: Move
export abstract class ControllerBase<T> {
	state: T
	setState: SetStoreFunction<T>
	constructor(state: T, setState: SetStoreFunction<T>) {
		this.state = state
		this.setState = setState
	}
}

export class UserDataController extends ControllerBase<UserPageData> {
	public get username(): string {
		return this.state.username
	}
	public get timeline(): TimeLineItem[] {
		return this.state.timeline
	}
}

export const [UserDataProvider, useUserData] = createProviderC<
	UserPageData,
	UserDataController
>(UserDataController)
