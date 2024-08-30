import { Menu } from "@ark-ui/solid"
import { Index, Show, Suspense } from "solid-js"
import { ThemeButton } from "~/component/theme_button"
import { clientAuthHelper } from "~/database/client"
import { type AppLocale, useI18N } from "~/state/i18n"
import { useUser } from "~/state/user"
import { Button } from "../button"
import { VTIconLanguages } from "../icons/vue_theme/language"
import style from "./header.module.css"

export default function Header() {
	const userController = useUser()
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
						<a
							href="/"
							class={navLinkClass}>
							占位符
						</a>
					</li>
					<li>
						<a
							href="/"
							class={navLinkClass}>
							占位符
						</a>
					</li>

					<li class="mx-1 size-8">
						<ThemeButton class="size-7 rounded-full" />
					</li>
					<li class="mx-1 size-8">
						<Language />
					</li>

					<Show
						when={userController.isSignedIn()}
						fallback={
							<>
								<li class="mx-1 min-w-fit">
									<a
										href={clientAuthHelper.getBuiltinUIUrl()}
										target="_self">
										<Button.Highlight class="shadow-4 mx-auto px-3 py-0.5">
											Sign In
										</Button.Highlight>
									</a>
								</li>
								<li class="mx-1 min-w-fit">
									<a
										href={clientAuthHelper.getBuiltinUISignUpUrl()}
										target="_self">
										<Button.Highlight class="shadow-4 mx-auto px-3 py-0.5">
											Sign Up
										</Button.Highlight>
									</a>
								</li>
							</>
						}>
						<li class={style["avatarWrapper"]}>
							<div class="flex">
								<div
									class={style["avatar"]}
									onClick={() => userController.signOut()}>
									<p class="text-xs text-gray-100">头像</p>
								</div>
							</div>
						</li>
					</Show>
				</ul>
			</nav>
		</header>
	)
}

function Language() {
	const locales: Record<AppLocale, string> = {
		en: "English",
		"zh-Hans": "简体中文",
	} as const
	const i18n = useI18N()

	return (
		<Suspense>
			<Menu.Root
				onSelect={(field) => {
					i18n.setLocale(field.value as unknown as AppLocale)
				}}
				positioning={{
					placement: "bottom",
					offset: { mainAxis: 4 },
				}}
				loopFocus>
				<Menu.Trigger
					asChild={(props) => (
						<Button.Borderless
							{...props()}
							class="flex size-7 place-content-center items-center rounded-full">
							<VTIconLanguages />
						</Button.Borderless>
					)}
				/>
				<Menu.Positioner>
					<Menu.Content class="focus-visible:outline-none">
						<div class="shadow-2 bg-main flex size-fit flex-col gap-1 rounded border-gray-300 p-1 transition-all">
							{/* TODO: UX */}
							<Index each={Object.entries(locales) as [AppLocale, string][]}>
								{(locale) => (
									<Menu.Item
										value={locale()[0]}
										closeOnSelect
										// disabled={i18n.locale() === locale()[0]}
										asChild={(props) => (
											<Button.Borderless
												{...props()}
												class={
													`data-[highlighted]:text-gray-1000 size-full px-2 py-1 text-start text-[14px] font-normal text-gray-900 outline-none hover:bg-gray-100 data-[highlighted]:bg-gray-200`
													// +
													// `aria-disabled:shadow-1 aria-disabled:text-gray-1000 aria-disabled:bg-gray-200 aria-disabled:font-medium`
												}>
												{locale()[1]}
											</Button.Borderless>
										)}
									/>
								)}
							</Index>
						</div>
					</Menu.Content>
				</Menu.Positioner>
			</Menu.Root>
		</Suspense>
	)
}
