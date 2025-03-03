import TimelineList from "./(comp)/time_line"
import { UserDataProvider } from "./controller"
import { testUserPageData } from "./user_test_data"

export default function UserPage() {
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
