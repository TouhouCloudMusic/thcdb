import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { LinkComponentProps } from "@tanstack/solid-router"
import { Link } from "@tanstack/solid-router"
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
import { sidebar, sidebarLink } from "~/component/Sidebar"
import type { UserAuthorization } from "~/domain/user/authorization"
import { hasAdminRole } from "~/domain/user/authorization"
import { useCurrentUser } from "~/state/user"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	layout: {
		display: "flex",
		maxWidth: px[256],
		flexDirection: "column",
		gap: px[8],
		padding: px[16],
	},
	heading: {
		marginLeft: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	list: {
		display: "flex",
		flexDirection: "column",
		gap: px[4],
		paddingRight: px[8],
	},
	settings: { marginTop: "auto", paddingInline: px[8] },
	settingsHeading: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
		marginBottom: px[8],
	},
	label: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textTertiary,
		marginBottom: px[8],
	},
})

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
		<div
			tabindex={-1}
			{...stylex.attrs(sidebar.panel, styles.layout)}
		>
			<h3 {...stylex.attrs(styles.heading)}>{t`Explore`}</h3>

			<ul {...stylex.attrs(styles.list)}>
				<For each={LIST_ITEMS}>
					{(item) => {
						return (
							<Link
								class={sidebarLink}
								aria-label={item.text}
								title={item.text}
								to={item.to}
							>
								<item.icon {...stylex.attrs(sidebar.icon)} />
								<span {...stylex.attrs(sidebar.content)}>{item.text}</span>
							</Link>
						)
					}}
				</For>
			</ul>

			<Show when={hasAdminRole(props.authorization)}>
				<div {...stylex.attrs(styles.list)}>
					<h3 {...stylex.attrs(styles.heading)}>{t`Admin`}</h3>
					<Link
						class={sidebarLink}
						aria-label={t`Users`}
						title={t`Users`}
						to="/admin/users"
					>
						<PersonIcon {...stylex.attrs(sidebar.icon)} />
						<span {...stylex.attrs(sidebar.content)}>{t`Users`}</span>
					</Link>
				</div>
			</Show>

			<div {...stylex.attrs(styles.settings)}>
				<h3 {...stylex.attrs(styles.settingsHeading)}>{t`Settings`}</h3>
				<div>
					<div {...stylex.attrs(styles.label)}>{t`Language`}</div>
					<LocaleSelect />
				</div>
			</div>
		</div>
	)
}
