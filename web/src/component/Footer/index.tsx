import { useLingui } from "@lingui/solid/macro"
import { For } from "solid-js"

const GITHUB_REPO_URL = "https://github.com/TouhouCloudMusic/thcdb"
const ZULIP_URL = "https://touhoucloud.zulipchat.com/"
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`
const CURRENT_YEAR = new Date().getFullYear()
const LINK_CLASS =
	"transition-colors hover:text-white hover:underline underline-offset-4"

type FooterLinkItem = {
	label: string
	href: string
	external?: boolean
}

function BrandColumn() {
	const { t } = useLingui()
	const brandLinks: FooterLinkItem[] = [
		{ label: "GitHub", href: GITHUB_REPO_URL, external: true },
		{ label: t`Zulip`, href: ZULIP_URL, external: true },
		{
			label: t`Feedback`,
			href: GITHUB_ISSUES_URL,
			external: true,
		},
	]

	return (
		<div class="grid grid-rows-[repeat(4,20px)] items-center gap-y-2">
			<div class="text-sm font-semibold tracking-wide">
				{t`Touhou Cloud DB`}
			</div>
			<p class="max-w-prose text-xs leading-relaxed text-slate-400">
				{t`Touhou Cloud DB is an open doujin music database`}
			</p>
			<div class="flex items-center gap-x-4 text-xs text-slate-300">
				<For each={brandLinks}>
					{(item) => (
						<a
							href={item.href}
							target={item.external ? "_blank" : undefined}
							rel={item.external ? "noreferrer noopener" : undefined}
							class={LINK_CLASS}
						>
							{item.label}
						</a>
					)}
				</For>
			</div>
			<div class="text-xs text-slate-500">
				<span>© {CURRENT_YEAR} THCDB</span>
			</div>
		</div>
	)
}

export function Footer() {
	return (
		<footer
			class="bg-slate-900 px-4 pt-4 pb-8 text-slate-200
				sm:px-6 sm:pt-8 sm:pb-12
				lg:px-[clamp(2rem,calc(5vw-2.5rem),3.5rem)]"
		>
			<BrandColumn />
		</footer>
	)
}
