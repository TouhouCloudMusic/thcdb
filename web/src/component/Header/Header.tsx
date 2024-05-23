import { Show } from "solid-js"
import style from "./Header.module.css"
import { useAppState } from "~/state/app.state"
import { ThemeButton } from "../ThemeButton"
export default function Header() {
	const appState = useAppState()
	const navLinkClass =
		"button !rounded-full mx-0 my-2 px-1 py-1 text-nowrap w-20 text-center"
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
						<a class={navLinkClass}>music</a>
					</li>
					<li>
						<a class={navLinkClass}>genres</a>
					</li>
					<li>
						<a class={navLinkClass}>charts</a>
					</li>
					<li>
						<a class={navLinkClass}>lists</a>
					</li>
					<li>
						<a class={navLinkClass}>forums</a>
					</li>
					<li>
						<input
							type="text"
							placeholder="Search"
							class={style.search_input}
						/>
					</li>
					<li>
						<a class={navLinkClass}>占位符</a>
					</li>
					<li>
						<a class={navLinkClass}>占位符</a>
					</li>
					<li>
						<a class={navLinkClass}>占位符</a>
					</li>
					<li>
						<a class={navLinkClass}>占位符</a>
					</li>
					<li class="size-8">
						<ThemeButton class="rounded-full size-full" />
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
