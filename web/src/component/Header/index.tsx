import { Dialog as K_Dialog } from "@kobalte/core"
import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQuery } from "@tanstack/solid-query"
import { Link, useNavigate } from "@tanstack/solid-router"
import { BellIcon } from "@thc/icons/heroicons/24/outline"
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "@thc/icons/radix"
import { StrExt } from "@thc/toolkit/data"
import { createSignal, Match, Show, Switch } from "solid-js"

import { Button, buttonStyles } from "~/component/atomic/button"
import { Select } from "~/component/atomic/form/select"
import { unreadCountOptions } from "~/hey-api/@tanstack/solid-query.gen"
import type { SessionProfile } from "~/state/user"
import { useCurrentUser } from "~/state/user"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { dividerStyles } from "~/style/primitives"
import {
	colors,
	lineHeights,
	fontSizes,
	px,
	radius,
} from "~/style/tokens.stylex"
import { createClickOutside } from "~/utils/solid/createClickOutside"

import { Avatar } from "../atomic/avatar"
import { Dialog } from "../dialog"
import { LeftSidebar } from "./LeftSidebar"
import { RightSidebar } from "./RightSidebar"

const pulse = stylex.keyframes({ "50%": { opacity: 0.5 } })

const styles = stylex.create({
	skeleton: {
		display: "grid",
		width: px[32],
		height: px[32],
		placeItems: "center",
	},
	skeletonDot: {
		width: px[16],
		height: px[16],
		borderRadius: radius.full,
		backgroundColor: palette.slate[200],
		animationName: pulse,
		animationDuration: "2s",
		animationTimingFunction: "cubic-bezier(.4,0,.6,1)",
		animationIterationCount: "infinite",
	},
	skeletonAvatar: {
		width: px[32],
		height: px[32],
		borderRadius: radius.full,
		backgroundColor: palette.slate[200],
		animationName: pulse,
		animationDuration: "2s",
		animationTimingFunction: "cubic-bezier(.4,0,.6,1)",
		animationIterationCount: "infinite",
	},
	header: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderBottomColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
		paddingInline: px[16],
		paddingBlock: px[8],
	},
	layout: {
		minHeight: px[32],
		display: "grid",
		gridTemplateColumns: {
			default: "auto minmax(0,1fr) auto",
			"@media (min-width: 40rem)": "repeat(3,minmax(0,1fr))",
		},
		rowGap: px[8],
		alignItems: "center",
	},
	left: {
		display: "flex",
		alignItems: "center",
		justifySelf: "start",
		gap: px[12],
	},
	menuIcon: {
		margin: "auto",
		width: px[20],
		height: px[20],
		color: palette.slate[400],
	},
	navigation: { position: "fixed", inset: 0, zIndex: 50, width: "fit-content" },
	divider: { height: px[24] },
	right: {
		gridColumnStart: "3",
		gridRowStart: "1",
		display: "flex",
		height: "100%",
		alignItems: "center",
		justifySelf: "end",
		gap: px[12],
	},
	bellContainer: {
		display: "grid",
		height: px[32],
		width: px[32],
		placeItems: "center",
	},
	avatarTrigger: {
		width: "fit-content",
		height: "fit-content",
		cursor: "pointer",
		borderRadius: radius.full,
		padding: 0,
	},
	dialog: { position: "fixed", inset: 0, zIndex: 50 },
	form: {
		gridColumn: {
			default: "span 3 / span 3",
			"@media (min-width: 40rem)": "span 1 / span 1",
		},
		gridColumnStart: { default: "1", "@media (min-width: 40rem)": "2" },
		gridRowStart: { default: "2", "@media (min-width: 40rem)": "1" },
		width: "100%",
		maxWidth: { default: null, "@media (min-width: 40rem)": px[384] },
		justifySelf: { default: null, "@media (min-width: 40rem)": "center" },
	},
	search: { position: "relative", display: "grid", alignItems: "center" },
	input: {
		marginRight: "auto",
		height: px[28],
		width: "100%",
		borderRadius: radius.xs,
		backgroundColor: { default: palette.slate[100], ":focus": palette.white },
		paddingLeft: px[28],
		transitionDuration: "200ms",
		outlineColor: {
			default: "transparent",
			":hover": { default: null, "@media (hover: hover)": palette.reimu[600] },
			":focus": palette.reimu[600],
		},
		outlineStyle: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "solid" },
			":focus": "solid",
		},
		outlineWidth: {
			default: null,
			":hover": { default: null, "@media (hover: hover)": "1px" },
			":focus": "1.5px",
		},
	},
	searchIcon: {
		pointerEvents: "none",
		position: "absolute",
		left: px[8],
		top: "50%",
		width: px[16],
		height: px[16],
		translate: "0 -50%",
		color: palette.slate[500],
	},
	filter: {
		position: "absolute",
		left: 0,
		top: "100%",
		zIndex: 50,
		marginTop: px[8],
		width: "100%",
		borderRadius: radius.sm,
		borderWidth: "1px",
		borderStyle: "solid",
		borderColor: palette.slate[200],
		backgroundColor: palette.white,
		padding: px[8],
		boxShadow:
			"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
	},
	filterRow: {
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
	},
	filterTitle: {
		fontSize: "11px",
		fontWeight: 500,
		letterSpacing: ".18em",
		color: palette.slate[500],
	},
	filterTrigger: {
		height: px[28],
		width: px[160],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	bell: {
		position: "relative",
		display: "grid",
		placeItems: "center",
		padding: px[4],
	},
	bellIcon: { margin: "auto", width: px[16], height: px[16] },
	unread: {
		position: "absolute",
		right: "-.375rem",
		top: "-.375rem",
		display: "grid",
		height: px[16],
		minWidth: px[16],
		placeItems: "center",
		borderRadius: radius.full,
		backgroundColor: palette.reimu[600],
		paddingInline: px[4],
		fontSize: fontSizes.xs,
		lineHeight: 1,
		color: palette.white,
	},
	auth: {
		display: "grid",
		gridTemplateColumns: "repeat(2,minmax(0,1fr))",
		gap: px[12],
	},
	headerButton: {
		margin: "auto",
		width: "fit-content",
		height: "fit-content",
		cursor: "pointer",
		padding: px[4],
	},
	authButton: {
		paddingBlock: px[4],
		paddingInline: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	signIn: { color: palette.slate[900] },
})

type EntityFilter =
	| "all"
	| "artist"
	| "event"
	| "label"
	| "release"
	| "song"
	| "tag"

const ENTITY_FILTER_OPTIONS: EntityFilter[] = [
	"all",
	"artist",
	"event",
	"label",
	"release",
	"song",
	"tag",
] as const

function HeaderSkeleton() {
	return (
		<>
			<div
				{...stylex.attrs(styles.skeleton)}
				aria-hidden="true"
			>
				<div {...stylex.attrs(styles.skeletonDot)}></div>
			</div>
			<div
				{...stylex.attrs(styles.skeletonAvatar)}
				aria-hidden="true"
			></div>
		</>
	)
}

export function Header() {
	const { t } = useLingui()
	const currentUser = useCurrentUser()
	const unread = useQuery(() => ({
		...unreadCountOptions(),
		enabled: currentUser.session.status === "authenticated",
	}))

	return (
		<header {...stylex.attrs(styles.header)}>
			<div {...stylex.attrs(styles.layout)}>
				{/* Left */}
				<div {...stylex.attrs(styles.left)}>
					<Dialog.Root>
						<K_Dialog.Trigger
							aria-label={t`Open navigation menu`}
							as={Button}
							appearance="ghost"
							tone="gray"
							styles={styles.headerButton}
						>
							<HamburgerMenuIcon {...stylex.attrs(styles.menuIcon)} />
						</K_Dialog.Trigger>
						<Dialog.Portal>
							<Dialog.Overlay />
							<K_Dialog.Content {...stylex.attrs(styles.navigation)}>
								<LeftSidebar />
							</K_Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>

					<span
						{...stylex.attrs(dividerStyles.vertical, styles.divider)}
					></span>
				</div>
				<SearchBar />

				{/* Right	*/}

				<div {...stylex.attrs(styles.right)}>
					<span
						{...stylex.attrs(dividerStyles.vertical, styles.divider)}
					></span>
					<Switch>
						<Match when={currentUser.session.status === "loading"}>
							<HeaderSkeleton />
						</Match>
						<Match when={currentUser.profile}>
							{(user) => (
								<AuthenticatedContent
									user={user()}
									unreadCount={unread.data?.data.count ?? 0}
								/>
							)}
						</Match>
						<Match when={currentUser.session.status === "anonymous"}>
							<UnauthenticatedButtons />
						</Match>
					</Switch>
				</div>
			</div>
		</header>
	)
}

type AuthenticatedContentProps = {
	user: SessionProfile
	unreadCount: number
}

function AuthenticatedContent(props: AuthenticatedContentProps) {
	const { t } = useLingui()
	const [show, setShow, setRef] = createClickOutside()
	const close = () => setShow(false)

	return (
		<>
			<div {...stylex.attrs(styles.bellContainer)}>
				<BellButton unreadCount={props.unreadCount} />
			</div>
			<Dialog.Root
				open={show()}
				onOpenChange={setShow}
			>
				<K_Dialog.Trigger
					as={Button}
					aria-label={t`Open user menu`}
					appearance="ghost"
					tone="gray"
					styles={styles.avatarTrigger}
				>
					<Avatar user={props.user} />
				</K_Dialog.Trigger>
				<Dialog.Portal>
					<Dialog.Overlay onClick={close} />
					<K_Dialog.Content {...stylex.attrs(styles.dialog)}>
						<RightSidebar
							ref={setRef}
							onClose={() => setShow(false)}
						/>
					</K_Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</>
	)
}

function SearchBar() {
	const { t } = useLingui()
	const navigate = useNavigate()
	let inputRef: HTMLInputElement | undefined

	const [entity, setEntity] = createSignal<EntityFilter>("all")
	const [showFilter, setShowFilter] = createSignal(false)

	const submit = (e: Event) => {
		e.preventDefault()
		const value = inputRef?.value.trim() ?? ""
		if (value.length === 0) return
		const selected = entity()
		if (selected === "all") {
			void navigate({ to: "/search", search: { q: value } })
		} else {
			void navigate({
				to: "/search",
				search: { q: value, entity: selected, tab: selected },
			})
		}
	}

	return (
		<form
			{...stylex.attrs(styles.form)}
			onSubmit={submit}
		>
			<div
				{...stylex.attrs(styles.search)}
				onFocusIn={() => setShowFilter(true)}
				onFocusOut={(e) => {
					const next = e.relatedTarget
					if (next instanceof Node && e.currentTarget.contains(next)) return
					setShowFilter(false)
				}}
			>
				<input
					ref={(el) => {
						inputRef = el
					}}
					type="search"
					aria-label={t`Search artists, releases, songs`}
					placeholder={t`Search artists, releases, songs…`}
					{...stylex.attrs(styles.input)}
				/>
				<MagnifyingGlassIcon {...stylex.attrs(styles.searchIcon)} />

				<Show when={showFilter()}>
					<div {...stylex.attrs(styles.filter)}>
						<div {...stylex.attrs(styles.filterRow)}>
							<div {...stylex.attrs(styles.filterTitle)}>
								<Trans>Filter</Trans>
							</div>
							<Select.Root
								options={ENTITY_FILTER_OPTIONS}
								value={entity()}
								onChange={(value) => {
									if (value === null) return
									setEntity(value)
								}}
								itemComponent={(props) => (
									<Select.Item item={props.item}>
										{StrExt.capitalize(props.item.rawValue)}
									</Select.Item>
								)}
							>
								<Select.Trigger styles={styles.filterTrigger}>
									<Select.Value<EntityFilter>>
										{(state) => StrExt.capitalize(state.selectedOption())}
									</Select.Value>
									<Select.Icon />
								</Select.Trigger>
								<Select.Portal>
									<Select.Content>
										<Select.Listbox />
									</Select.Content>
								</Select.Portal>
							</Select.Root>
						</div>
					</div>
				</Show>
			</div>
		</form>
	)
}

function BellButton(props: { unreadCount: number }) {
	const { t } = useLingui()

	return (
		<Link
			to="/notifications"
			search={{ state: "inbox" }}
			aria-label={t`Notifications`}
			{...stylex.attrs(styles.bell)}
		>
			<BellIcon {...stylex.attrs(styles.bellIcon)} />
			<Show when={props.unreadCount > 0}>
				<span {...stylex.attrs(styles.unread)}>
					{props.unreadCount > 99 ? "99+" : props.unreadCount}
				</span>
			</Show>
		</Link>
	)
}

function UnauthenticatedButtons() {
	const { t } = useLingui()

	return (
		<div {...stylex.attrs(styles.auth)}>
			<Link
				to="/auth/sign-in"
				class={
					stylex.attrs(
						link.base,
						buttonStyles.base,
						buttonStyles.ghost,
						buttonStyles.gray,
						buttonStyles.ghostGray,
						styles.authButton,
						styles.signIn,
					).class
				}
			>
				{t`Sign In`}
			</Link>
			<Link
				to="/auth/sign-up"
				class={
					stylex.attrs(
						link.base,
						buttonStyles.base,
						buttonStyles.solid,
						buttonStyles.gray,
						styles.authButton,
					).class
				}
			>
				{t`Sign Up`}
			</Link>
		</div>
	)
}
