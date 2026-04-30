import { useLingui } from "@lingui/solid/macro"
import { For } from "solid-js"

const GITHUB_REPO_URL = "https://github.com/TouhouCloudMusic/thcdb"
const ZULIP_URL = "https://touhoucloud.zulipchat.com/"
const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`
const CURRENT_YEAR = new Date().getFullYear()
const COLUMN_CLASS = "px-2 my-2"
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
		<div class={COLUMN_CLASS}>
			<div class="text-sm font-semibold tracking-wide">
				{t`Touhou Cloud DB`}
			</div>
			<p class="mt-2 max-w-prose text-xs leading-relaxed text-slate-400">
				{t`Touhou Cloud DB is an open doujin music database`}
			</p>
			<div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
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
			<div class="mt-3 text-xs text-slate-500">
				<span>© {CURRENT_YEAR} THCDB</span>
			</div>
		</div>
	)
}

export function Footer() {
	return (
		<footer class="min-h-48 bg-slate-900 text-slate-200 py-6 px-12">
			<div class=" h-full divide-x divide-slate-700">
				<BrandColumn />
			</div>
		</footer>
	)
}
