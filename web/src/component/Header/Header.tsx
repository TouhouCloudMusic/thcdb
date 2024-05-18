import { Show } from "solid-js"
import style from "./Header.module.css"
import { useAppState } from "~/state/app.state"
export default function Header() {
	const appState = useAppState()
	return (
		<header>
			<nav>
				<ul>
					<li class={style.logo}>
						<a href="/">
							<strong>LOGO</strong>
						</a>
					</li>
					<li>
						<a class={style.navLink}>new music</a>
					</li>
					<li>
						<a class={style.navLink}>genres</a>
					</li>
					<li>
						<a class={style.navLink}>charts</a>
					</li>
					<li>
						<a class={style.navLink}>lists</a>
					</li>
					<li>
						<a class={style.navLink}>forums</a>
					</li>
					<li>
						<input
							type="text"
							placeholder="Search"
							class={style.search_input}
						/>
					</li>
					<li>
						<a class={style.navLink}>占位符</a>
					</li>
					<li>
						<a class={style.navLink}>占位符</a>
					</li>
					<li>
						<a class={style.navLink}>占位符</a>
					</li>
					<li>
						<a class={style.navLink}>占位符</a>
					</li>
					<li class={style.avatarWrapper}>
						<Show
							when={appState.user()?.username ?? false}
							fallback={
								<button
									class="h-9 place-content-center rounded-md bg-green-600 px-2.5 text-center text-white hover:bg-green-600/80 active:bg-green-700/90"
									onClick={() => {
										appState.devLogIn()
										console.log(appState.user())
									}}>
									<span class="mx-auto">登录/注册</span>
								</button>
							}>
							<div class="flex">
								<div
									class={style.avatar}
									onClick={() => {
										appState.logOut()
										console.log(appState.user())
										console.log(appState.appTheme())
									}}>
									<p class="text-xs text-gray-100">头像</p>
								</div>
							</div>
						</Show>
					</li>
				</ul>
			</nav>
		</header>
	)
}
