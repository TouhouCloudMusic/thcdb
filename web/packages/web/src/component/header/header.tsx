import { Menu } from "@ark-ui/solid"
import { For, Show } from "solid-js"
import { ThemeButton } from "~/component/theme_button"
import { useAppState } from "~/state/app_state"
import { AppLocale, useI18N } from "~/state/i18n"
import { Button } from "../button"
import { VTIconLanguages } from "../icons/vue_theme/language"
import style from "./header.module.css"

export default function Header() {
	const appState = useAppState()
	const navLinkClass =
		"button !rounded-full mx-0 my-2 px-1 py-1 text-nowrap w-20 text-center"
	return (
		<header>
			<nav>
				<ul>
					<li class={style["logo"]}>
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
							class={style["search_input"]}
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
					<li class="mx-1 size-8">
						<ThemeButton class="size-7 rounded-full" />
					</li>
					<li class="mx-1 size-8">
						<Language />
					</li>
					<li class={style["avatarWrapper"]}>
						<Show
							when={appState.user()?.username ?? false}
							fallback={
								<button
									class="h-9 place-content-center rounded-md bg-green-600 px-2.5 text-center text-white hover:bg-green-600/80 active:bg-green-700/90"
									onClick={() => {
										appState.devLogIn()
									}}>
									<span class="mx-auto">登录/注册</span>
								</button>
							}>
							<div class="flex">
								<div
									class={style["avatar"]}
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

function Language() {
	const locales: Record<AppLocale, string> = {
		en: "English",
		zh_hans: "简体中文",
	} as const
	const i18n = useI18N()

	return (
		<Menu.Root
			onSelect={(field) => i18n.setLocale(field.value as unknown as AppLocale)}>
			<Menu.Trigger
				class="size-fit"
				asChild={(props) => (
					<Button.Borderless
						{...props()}
						class="flex size-7 place-content-center items-center rounded-full">
						<VTIconLanguages />
					</Button.Borderless>
				)}
			/>
			<Menu.Positioner>
				<Menu.Content>
					<For each={Object.entries(locales)}>
						{(locale) => <Menu.Item value={locale[0]}>{locale[1]}</Menu.Item>}
					</For>
				</Menu.Content>
			</Menu.Positioner>
		</Menu.Root>
	)
}
