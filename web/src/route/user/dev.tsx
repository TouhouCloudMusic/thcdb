import TimelineList from "./(comp)/time_line"
import { testUserPageData } from "./mock_data"
import { UserDataProvider } from "./store"

export default function UserPage() {
  return (
    <UserDataProvider defaultState={testUserPageData}>
      <main class="flex">
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
