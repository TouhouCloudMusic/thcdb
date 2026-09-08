import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import {
	BookmarkIcon,
	Cross1Icon,
	CubeIcon,
	ExitIcon,
	GearIcon,
	Pencil2Icon,
	PersonIcon,
} from "@thc/icons/radix"
import type { Ref } from "solid-js"
import { Show } from "solid-js"

import { sidebar, sidebarLink } from "~/component/Sidebar"
import { Button } from "~/component/atomic/button"
import type { SessionProfile } from "~/state/user"
import { useCurrentUser } from "~/state/user"
import { dividerStyles } from "~/style/primitives"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"

import { Avatar } from "../atomic/avatar"

const styles = stylex.create({
	layout: {
		position: "relative",
		right: 0,
		display: "flex",
		height: "100%",
		flexDirection: "column",
		gap: px[8],
		padding: px[12],
	},
	profile: { display: "flex", paddingLeft: px[4] },
	name: {
		marginInline: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
	},
	close: {
		marginRight: px[4],
		marginLeft: "auto",
		width: "fit-content",
		height: "fit-content",
		alignSelf: "center",
		padding: px[4],
	},
	divider: { marginBlock: px[2], paddingInline: px[8] },
	list: { display: "flex", flexDirection: "column" },
})

export function RightSidebar(props: {
	onClose: VoidFunction
	ref?: Ref<HTMLDivElement>
}) {
	const currentUser = useCurrentUser()

	return (
		<Show when={currentUser.profile}>
			{(user) => (
				<RightSidebarView
					ref={props.ref}
					user={user()}
					onClose={props.onClose}
					onSignOut={() => {
						void currentUser.signOut()
					}}
				/>
			)}
		</Show>
	)
}

export function RightSidebarView(props: {
	user: SessionProfile
	onClose: VoidFunction
	onSignOut: VoidFunction
	ref?: Ref<HTMLDivElement>
}) {
	const { t } = useLingui()

	return (
		<>
			<div
				ref={props.ref}
				tabindex={-1}
				{...stylex.attrs(sidebar.panel, styles.layout)}
			>
				<div {...stylex.attrs(styles.profile)}>
					<Avatar user={props.user} />
					<div {...stylex.attrs(styles.name)}>{props.user.name}</div>
					<Button
						onClick={props.onClose}
						appearance="ghost"
						tone="gray"
						styles={styles.close}
					>
						<Cross1Icon />
					</Button>
				</div>
				<span
					{...stylex.attrs(dividerStyles.horizontal, styles.divider)}
				></span>
				<div {...stylex.attrs(styles.list)}>
					<Link
						class={sidebarLink}
						to="/profile"
					>
						<PersonIcon {...stylex.attrs(sidebar.icon)} />
						<span {...stylex.attrs(sidebar.content)}>{t`Profile`}</span>
					</Link>
					<Link
						class={sidebarLink}
						to="/profile"
						search={{ tab: "collections" }}
					>
						<BookmarkIcon {...stylex.attrs(sidebar.icon)} />
						<span {...stylex.attrs(sidebar.content)}>{t`Collections`}</span>
					</Link>
					<Link
						class={sidebarLink}
						to="."
					>
						<CubeIcon {...stylex.attrs(sidebar.icon)} />
						<span {...stylex.attrs(sidebar.content)}>{t`Recommendations`}</span>
					</Link>
				</div>
				<span
					{...stylex.attrs(dividerStyles.horizontal, styles.divider)}
				></span>
				<div {...stylex.attrs(styles.list)}>
					<Link
						class={sidebarLink}
						to="."
					>
						<Pencil2Icon {...stylex.attrs(sidebar.icon)} />
						<span {...stylex.attrs(sidebar.content)}>{t`Support`}</span>
					</Link>
					<Link
						class={sidebarLink}
						to="."
					>
						<GearIcon {...stylex.attrs(sidebar.icon)} />
						<span {...stylex.attrs(sidebar.content)}>{t`Settings`}</span>
					</Link>
					<Button
						type="button"
						appearance="ghost"
						tone="gray"
						styles={sidebar.item}
						onClick={() => props.onSignOut()}
					>
						<ExitIcon {...stylex.attrs(sidebar.icon)} />
						<span {...stylex.attrs(sidebar.content)}>{t`Sign Out`}</span>
					</Button>
				</div>
			</div>
		</>
	)
}
