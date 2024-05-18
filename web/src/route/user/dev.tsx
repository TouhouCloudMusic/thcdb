import style from "./user_page.module.css"
import { UserDataProvider } from "~/component/UserPage/UserDataProvider"
import { testUserPageData } from "~/component/UserPage/user.test.data"
import TimelineList from "~/component/UserPage/TimelineList"
export default function UserPage() {
	style && true
	return (
		<UserDataProvider defaultState={testUserPageData}>
			<main>
				<aside class="grow">
					这里是aside
					<div class="avatar">这里是头像</div>
					<div>这里是个人信息</div>
				</aside>
				<div class={"grow"}>
					<div>
						<h3>Timeline</h3>
						<TimelineList />
					</div>
				</div>
			</main>
		</UserDataProvider>
	)
}
