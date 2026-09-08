import { Dialog as K_Dialog } from "@kobalte/core"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "@thc/icons/radix"
import dayjs from "dayjs"
import type { Meta, StoryObj } from "storybook-solidjs-vite"

import { Footer } from "~/component/Footer"
import { LeftSidebarView } from "~/component/Header/LeftSidebar"
import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { createMockArtistListItem } from "~/mock/artist"
import { createMockEvent } from "~/mock/event"
import { createMockReleaseListItem } from "~/mock/release"
import { createMockTagListItem } from "~/mock/tag"
import { palette } from "~/style/color/palette.stylex"
import { dividerStyles } from "~/style/primitives"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { StoryRouterProvider } from "~/utils/adapter/storybook"
import { HomePage } from "~/view/Homepage"
import {
	ARTISTS_LIMIT,
	EVENTS_LIMIT,
	RELEASES_LIMIT,
	TAGS_LIMIT,
} from "~/view/Homepage/constants"

const styles = stylex.create({
	divider: { height: px[24] },
	header: {
		borderBottomWidth: 1,
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
		backgroundColor: colors.backgroundPrimary,
		paddingInline: px[16],
		paddingBlock: px[8],
	},
	headerContent: {
		display: { default: "grid", "@media (min-width: 80rem)": "flex" },
		minHeight: px[32],
		gridTemplateColumns: "auto minmax(0,1fr) auto",
		alignItems: "center",
		rowGap: px[8],
		justifyContent: {
			default: null,
			"@media (min-width: 80rem)": "space-between",
		},
	},
	brand: { display: "flex", alignItems: "center", gap: px[12] },
	menu: {
		margin: "auto",
		width: "fit-content",
		height: "fit-content",
		padding: px[4],
	},
	menuIcon: {
		margin: "auto",
		height: px[20],
		width: px[20],
		color: palette.slate[400],
	},
	sidebar: { position: "fixed", inset: 0, zIndex: 50, width: "fit-content" },
	searchRoot: {
		position: "relative",
		gridColumnStart: { default: "1", "@media (min-width: 40rem)": "2" },
		gridColumnEnd: { default: "span 3", "@media (min-width: 40rem)": "span 1" },
		gridRowStart: { default: "2", "@media (min-width: 40rem)": "1" },
		display: "grid",
		alignItems: "center",
		width: { default: null, "@media (min-width: 40rem)": "100%" },
		maxWidth: { default: null, "@media (min-width: 40rem)": px[384] },
		justifySelf: { default: null, "@media (min-width: 40rem)": "center" },
		marginLeft: { default: null, "@media (min-width: 80rem)": px[144] },
	},
	search: {
		marginRight: "auto",
		height: px[28],
		width: "100%",
		borderRadius: radius.xs,
		backgroundColor: palette.slate[100],
		paddingLeft: px[28],
		outlineColor: "transparent",
	},
	searchIcon: {
		pointerEvents: "none",
		position: "absolute",
		left: px[8],
		top: "50%",
		height: px[16],
		width: px[16],
		translate: "0 -50%",
		color: palette.slate[500],
	},
	actions: {
		gridColumnStart: "3",
		gridRowStart: "1",
		display: "flex",
		height: "100%",
		flexShrink: 1,
		placeContent: "center",
		alignItems: "center",
		gap: px[12],
	},
	auth: {
		display: "grid",
		gridTemplateColumns: "repeat(2,minmax(0,1fr))",
		gap: px[12],
	},
	signIn: {
		paddingInline: px[12],
		paddingBlock: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[900],
	},
	signUp: {
		paddingInline: px[12],
		paddingBlock: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	root: {
		display: "grid",
		minHeight: "100dvh",
		gridTemplateRows: "auto 1fr auto",
		backgroundColor: palette.slate[100],
	},
})
function createHomeStoryData() {
	const releases = Array.from({ length: RELEASES_LIMIT }, (_, index) =>
		createMockReleaseListItem(
			101 + index,
			index >= RELEASES_LIMIT / 2 ? { cover_art_url: null } : {},
		),
	)
	const events = Array.from({ length: EVENTS_LIMIT }, (_, index) =>
		createMockEvent(201 + index, {
			start_date: {
				precision: "Day",
				value: dayjs()
					.add(index + 1, "week")
					.format("YYYY-MM-DD"),
			},
			end_date: undefined,
		}),
	)

	return {
		statistics: {
			artists: 12_480,
			releases: 38_912,
			songs: 186_730,
			tags: 2_406,
		},
		releases,
		artists: Array.from({ length: ARTISTS_LIMIT }, (_, index) =>
			createMockArtistListItem(101 + index),
		),
		tags: Array.from({ length: TAGS_LIMIT }, (_, index) =>
			createMockTagListItem(
				101 + index,
				index === 0
					? {
							name: "Trance",
							type: "Genre",
							parents: [{ id: 1, name: "Electronic", type: "Genre" }],
						}
					: {},
			),
		),
		events,
	}
}

const STORY_DATA = createHomeStoryData()

function StoryHeader() {
	return (
		<header {...stylex.attrs(styles.header)}>
			<div {...stylex.attrs(styles.headerContent)}>
				<div {...stylex.attrs(styles.brand)}>
					<Dialog.Root>
						<K_Dialog.Trigger
							as={Button}
							appearance="ghost"
							tone="gray"
							styles={styles.menu}
						>
							<HamburgerMenuIcon {...stylex.attrs(styles.menuIcon)} />
						</K_Dialog.Trigger>
						<Dialog.Portal>
							<Dialog.Overlay />
							<K_Dialog.Content {...stylex.attrs(styles.sidebar)}>
								<LeftSidebarView />
							</K_Dialog.Content>
						</Dialog.Portal>
					</Dialog.Root>

					<span
						{...stylex.attrs(dividerStyles.vertical, styles.divider)}
					></span>
				</div>

				<div {...stylex.attrs(styles.searchRoot)}>
					<input
						type="search"
						aria-label="Search artists, releases, songs"
						placeholder="Search artists, releases, songs…"
						{...stylex.attrs(styles.search)}
					/>
					<MagnifyingGlassIcon {...stylex.attrs(styles.searchIcon)} />
				</div>

				<div {...stylex.attrs(styles.actions)}>
					<span
						{...stylex.attrs(dividerStyles.vertical, styles.divider)}
					></span>
					<div {...stylex.attrs(styles.auth)}>
						<Button
							type="button"
							appearance="ghost"
							tone="gray"
							styles={styles.signIn}
						>
							<Link to="/auth/sign-in">Sign In</Link>
						</Button>
						<Button
							type="button"
							appearance="solid"
							tone="gray"
							styles={styles.signUp}
						>
							<Link to="/auth/sign-up">Sign Up</Link>
						</Button>
					</div>
				</div>
			</div>
		</header>
	)
}

function StoryRoot() {
	return (
		<StoryRouterProvider>
			<div {...stylex.attrs(styles.root)}>
				<StoryHeader />
				<main>
					<HomePage {...STORY_DATA} />
				</main>
				<Footer />
			</div>
		</StoryRouterProvider>
	)
}

const meta = {
	title: "View/Homepage",
	component: StoryRoot,
	parameters: {
		layout: "fullscreen",
		backgrounds: {
			grid: {
				disable: true,
			},
		},
	},
} satisfies Meta<typeof StoryRoot>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}
