import { useLingui } from "@lingui-solid/solid"
import { Title } from "@solidjs/meta"
import { createFileRoute, Link } from "@tanstack/solid-router"

import { Button } from "~/components/button"
import { useI18N } from "~/state/i18n"
import { useUserCtx } from "~/state/user"

export const Route = createFileRoute("/")({
	component: HomePage,
})

function HomePage() {
	const userContext = useUserCtx()
	const i18n = useI18N()

	return (
		<div class="flex justify-center">
			<div class="w-240">
				<Title>Hello World</Title>
				<ul class="my-2 flex flex-col gap-2">
					<li>
						<Link to="/about">About</Link>
					</li>
					<li>
						<Link to="/profile">Profile</Link>
					</li>

					<Button
						class="w-48"
						variant="Primary"
						onClick={() =>
							i18n.setLocale(i18n.locale == "en" ? "zh-Hans" : "en")
						}
					>
						Lang: {i18n.locale}
					</Button>
					<Button
						// eslint-disable-next-line solid/reactivity
						onClick={async () => {
							await userContext.sign_out()
						}}
					>
						Sign Out
					</Button>
				</ul>
			</div>
		</div>
	)
}
