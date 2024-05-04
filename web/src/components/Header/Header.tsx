import { Show } from "solid-js";
import "./Header.css";
import { useAppState } from "~/states/app.state";
export default function Header() {
	const { user, setUser, logOut } = useAppState();
	return (
		<header>
			<nav>
				<div class="logo">
					<a href="/">
						<strong>LOGO</strong>
					</a>
				</div>
				<div>
					<a>new music</a>
				</div>
				<div>
					<a>genres</a>
				</div>
				<div>
					<a>charts</a>
				</div>
				<div>
					<a>lists</a>
				</div>
				<div>
					<a>forums</a>
				</div>
				<div>
					<input
						type="text"
						placeholder="Search"
						class="search_input"
					/>
				</div>
				<div>
					<a>占位符</a>
				</div>
				<div>
					<a>占位符</a>
				</div>
				<div>
					<a>占位符</a>
				</div>
				<div>
					<a>占位符</a>
				</div>
				<div class="avatarWrapper">
					<Show
						when={user()?.username}
						fallback={
							<button
								class="h-9 place-content-center rounded-md bg-green-600 px-2.5 text-center text-white hover:bg-green-600/80 active:bg-green-700/90"
								onClick={() => setUser({ username: "admin" })}>
								<span class="mx-auto">登录/注册</span>
							</button>
						}>
						<div class="flex">
							<div
								class="avatar"
								onClick={logOut}>
								<p class="text-xs text-gray-100">头像</p>
							</div>
						</div>
					</Show>
				</div>
			</nav>
		</header>
	);
}
