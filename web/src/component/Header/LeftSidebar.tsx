import { useLingui } from "@lingui/solid/macro"
import type { LinkComponentProps } from "@tanstack/solid-router"
import type { IconProps } from "@thc/icons"
import {
	CardStackIcon,
	BookmarkIcon,
	EnvelopeClosedIcon,
	MixerHorizontalIcon,
	TargetIcon,
	CrumpledPaperIcon,
	HomeIcon,
	PersonIcon,
} from "@thc/icons/radix"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"

import { LocaleSelect } from "~/component/Header/LocaleSelect"
import { ListItem, Sidebar } from "~/component/Sidebar"
import type { UserAuthorization } from "~/domain/user/authorization"
import { hasAdminRole } from "~/domain/user/authorization"
import { useCurrentUser } from "~/state/user"

type ListItemContent = {
	icon: (props: IconProps) => JSX.Element
	readonly text: string
	to: LinkComponentProps["to"]
}

export function LeftSidebar() {
	const currentUser = useCurrentUser()

	return <LeftSidebarView authorization={currentUser.authorization} />
}

export function LeftSidebarView(props: { authorization?: UserAuthorization }) {
	const { t } = useLingui()

	// TODO: Icons
	const LIST_ITEMS: ListItemContent[] = [
		{
			icon: HomeIcon,
			// @wc-include
			get text() {
				return t`Home`
			},
			to: "/",
		},
		{
			icon: TargetIcon,
			// @wc-include
			get text() {
				return t`Recommendation`
			},
			to: "/recommendation",
		},
		{
			icon: CrumpledPaperIcon,
			// @wc-include
			get text() {
				return t`Release`
			},
			to: "/release/explore",
		},
		{
			icon: MixerHorizontalIcon,
			// @wc-include
			get text() {
				return t`Artist`
			},
			to: "/artist/explore",
		},
		{
			icon: CardStackIcon,
			// @wc-include
			get text() {
				return t`Song`
			},
			to: "/song/explore",
		},
		{
			icon: EnvelopeClosedIcon,
			// @wc-include
			get text() {
				return t`Tag`
			},
			to: "/tag/explore",
		},
		{
			icon: EnvelopeClosedIcon,
			// @wc-include
			get text() {
				return t`Event`
			},
			to: "/event/explore",
		},
		{
			icon: BookmarkIcon,
			// @wc-include
			get text() {
				return t`Label`
			},
			to: "/label/explore",
		},
	]

	return (
		<Sidebar class="flex max-w-64 flex-col gap-2 p-4">
			<h3 class="ml-2 text-sm text-secondary ">{t`Explore`}</h3>

			<ul class="space-y-1 pr-2">
				<For each={LIST_ITEMS}>
					{(item) => {
						return (
							<ListItem
								class="w-full"
								aria-label={item.text}
								title={item.text}
								to={item.to}
							>
								<item.icon class="mr-3 h-4 w-4" />
								<span>{item.text}</span>
							</ListItem>
						)
					}}
				</For>
			</ul>

			<Show when={hasAdminRole(props.authorization)}>
				<div class="space-y-1 pr-2">
					<h3 class="ml-2 text-sm text-secondary">{t`Admin`}</h3>
					<ListItem
						class="w-full"
						aria-label={t`Users`}
						title={t`Users`}
						to="/admin/users"
					>
						<PersonIcon class="mr-3 h-4 w-4" />
						<span>{t`Users`}</span>
					</ListItem>
				</div>
			</Show>

			<div class="mt-auto space-y-2 px-2">
				<h3 class="text-sm text-secondary">{t`Settings`}</h3>
				<div class="space-y-2">
					<div class="text-sm text-tertiary">{t`Language`}</div>
					<LocaleSelect />
				</div>
			</div>
		</Sidebar>
	)
}
