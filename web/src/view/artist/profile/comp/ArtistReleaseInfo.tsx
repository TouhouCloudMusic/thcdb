/* @refresh skip */
import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { StyleXStyles } from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type {
	ArtistCredit,
	CreditRoleRef,
	Discography,
	ReleaseType,
} from "@thc/api"
import type { JSX, ParentProps } from "solid-js"
import { createMemo, createSignal, For, Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic/Tab"
import { Button } from "~/component/atomic/button"
import { RELEASE_TYPES } from "~/domain/release"
import { DateWithPrecision } from "~/domain/shared"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"

import { ArtistContext } from ".."

// TODO: Add links after other pages are completed

const styles = stylex.create({
	tabTrigger: {
		paddingInline: px[12],
		paddingBlock: px[12],
		color: palette.slate[800],
	},
	releases: {
		padding: "clamp(1rem,3vw,1.5rem)",
	},
	tabContent: {
		padding: px[16],
	},
	emptyState: {
		margin: "auto",
		minHeight: px[64],
		placeSelf: "center",
		paddingInline: px[16],
		paddingBlock: px[20],
		textAlign: "center",
		color: colors.textSecondary,
	},
	uploadLink: {
		color: palette.blue[600],
	},
	releaseTypes: {
		flexWrap: "wrap",
		gap: px[8],
		paddingInline: px[8],
		paddingTop: px[16],
	},
	releaseType: {
		display: "flex",
		height: px[40],
		alignItems: "center",
		justifyContent: "center",
		borderRadius: radius.md,
		paddingInline: px[12],
		textAlign: "center",
		fontWeight: 400,
		color: colors.textSecondary,
		outlineWidth: 2,
		outlineStyle: "solid",
		outlineOffset: 2,
		outlineColor: {
			default: "transparent",
			":focus-visible": palette.slate[300],
		},
		backgroundColor: {
			default: null,
			":is([data-selected])": palette.slate[100],
		},
	},
	releaseItem: {
		marginBlockStart: 0,
		marginBlockEnd: { default: null, ":not(:last-child)": px[16] },
	},
	subtitle: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: colors.textSecondary,
	},
	loadMore: {
		display: "flex",
		width: "100%",
		justifyContent: "center",
	},
	loadMoreButton: {
		paddingInline: px[64],
		fontWeight: 400,
	},
	creditHeading: {
		display: "flex",
		flexWrap: "wrap",
	},
	creditArtists: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "last baseline",
	},
	creditArtist: {
		lineHeight: "1.5rem",
		color: colors.textSecondary,
	},
	coverPlaceholder: {
		marginInlineStart: 0,
		marginInlineEnd: px[16],
		width: px[64],
		height: px[64],
		borderRadius: radius.sm,
		backgroundColor: colors.backgroundSecondary,
	},
	releaseDetails: {
		display: "grid",
		minWidth: 0,
		gridTemplateRows: "repeat(2, minmax(0, 1fr))",
		alignItems: "center",
	},
	releaseLink: {
		display: "flex",
		height: px[64],
		width: "100%",
		borderRadius: radius.md,
		marginInline: "-0.5rem",
		paddingInline: px[8],
		color: "inherit",
	},
	releaseTitle: {
		overflowWrap: "break-word",
		fontWeight: 600,
		color: palette.slate[900],
	},
})

const TABS = [
	"Discography",
	"Appearance",
	"Credit",
	"Comments",
	"Collections",
] as const

type ArtistReleaseInfoViewProps = {
	activeTab: string
	comments: EntityCommentsModel
	onActiveTabChange: (value: string) => void
}

export function ArtistReleaseInfo() {
	const { t } = useLingui()
	const context = assertContext(ArtistContext)

	return (
		<Suspense fallback={<div>{t`Loading...`}</div>}>
			<Show
				when={
					!(
						context.discographies.isLoading
						|| context.appearances.isLoading
						|| context.credits.isLoading
					)
				}
				fallback={<div>{t`Loading...`}</div>}
			>
				<Inner />
			</Show>
		</Suspense>
	)
}

function Inner() {
	const context = assertContext(ArtistContext)
	const [activeTab, setActiveTab] = createSignal("Discography")
	const comments = useEntityComments(() => ({
		entityType: "artist",
		entityId: context.artist.id,
		listEnabled: activeTab() === "Comments",
	}))

	return (
		<ArtistReleaseInfoView
			activeTab={activeTab()}
			comments={comments}
			onActiveTabChange={setActiveTab}
		/>
	)
}

export function ArtistReleaseInfoView(props: ArtistReleaseInfoViewProps) {
	const context = assertContext(ArtistContext)
	const visibleTabs = createMemo(() =>
		TABS.filter((tab) => {
			switch (tab) {
				case "Discography": {
					return true
				}
				case "Appearance": {
					return context.appearances.data.length > 0
				}
				case "Credit": {
					return context.credits.data.length > 0
				}
				case "Comments": {
					return true
				}
				case "Collections": {
					return true
				}
			}
		}),
	)

	return (
		// https://github.com/kobaltedev/kobalte/issues/222
		<Tab.Root
			value={props.activeTab}
			onChange={props.onActiveTabChange}
		>
			<Tab.ScrollArea>
				<Tab.List styles={[Tab.containerStyles]}>
					<For each={visibleTabs()}>
						{(tabType) => (
							<li>
								<Show
									when={tabType === "Comments"}
									fallback={
										<Tab.Trigger
											styles={[styles.tabTrigger]}
											value={tabType}
										>
											{tabType}
										</Tab.Trigger>
									}
								>
									<EntityCommentsTabTrigger
										count={props.comments.activeCommentCount()}
										styles={[styles.tabTrigger]}
									/>
								</Show>
							</li>
						)}
					</For>
					<Tab.Indicator />
				</Tab.List>
			</Tab.ScrollArea>

			<Tab.Content value="Discography">
				<DiscographyTab />
			</Tab.Content>
			<Tab.Content value="Appearance">
				<ArtistReleaseList
					styles={[styles.releases]}
					data={context.appearances.data}
					hasNext={context.appearances.hasNext}
					next={() => {
						void context.appearances.next()
					}}
				>
					{(itemProps) => <DiscographyItem {...itemProps} />}
				</ArtistReleaseList>
			</Tab.Content>
			<Tab.Content value="Credit">
				<ArtistReleaseList
					styles={[styles.releases]}
					data={context.credits.data}
					hasNext={context.credits.hasNext}
					next={() => {
						void context.credits.next()
					}}
				>
					{(itemProps) => <CreditItem {...itemProps} />}
				</ArtistReleaseList>
			</Tab.Content>
			<Tab.Content
				value="Comments"
				styles={[styles.tabContent]}
			>
				<EntityComments model={props.comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				styles={[styles.tabContent]}
			>
				<EntityCollectionsTab
					entityType="artist"
					entityId={context.artist.id}
					enabled={props.activeTab === "Collections"}
				/>
			</Tab.Content>
		</Tab.Root>
	)
}

function DiscographyTab() {
	const context = assertContext(ArtistContext)
	const [selectedTypeInput, setSelectedTypeInput] =
		createSignal<ReleaseType>("Album")

	const existingTypes = createMemo(() => {
		return RELEASE_TYPES.filter(
			(type) => context.discographies.data[type].length,
		)
	})

	const selectedType = createMemo<ReleaseType | undefined>(() => {
		const current = selectedTypeInput()
		if (existingTypes().includes(current)) {
			return current
		}

		return existingTypes()[0]
	})

	return (
		<Show
			when={selectedType()}
			fallback={
				<p {...stylex.attrs(styles.emptyState)}>
					<Trans>
						This Artist has no releases yet, you can upload them on{" "}
						<a
							href="TODO"
							{...stylex.attrs(styles.uploadLink)}
						>
							Upload New Release
						</a>
					</Trans>
				</p>
			}
		>
			{(type) => (
				<Tab.Root
					value={type()}
					onChange={setSelectedTypeInput}
				>
					<Tab.List styles={[styles.releaseTypes]}>
						<For each={existingTypes()}>
							{(releaseType) => (
								<Tab.Trigger
									value={releaseType}
									styles={[styles.releaseType]}
								>
									{releaseType}
								</Tab.Trigger>
							)}
						</For>
					</Tab.List>

					<ArtistReleaseList
						styles={[styles.releases]}
						data={context.discographies.data[type()]}
						hasNext={context.discographies.hasNext(type())}
						next={() => {
							void context.discographies.next(type())
						}}
					>
						{(props) => <DiscographyItem {...props} />}
					</ArtistReleaseList>
				</Tab.Root>
			)}
		</Show>
	)
}

function ArtistReleaseList<T extends Discography | CreditRoleRef>(props: {
	data?: T[] | undefined
	hasNext: boolean
	next: () => void
	styles?: StyleXStyles
	children: (props: { item: T }) => JSX.Element
}) {
	const { t } = useLingui()

	return (
		<ul {...stylex.attrs(props.styles)}>
			<For each={props.data}>
				{(release) => props.children({ item: release })}
			</For>

			<Show when={props.hasNext}>
				<div {...stylex.attrs(styles.loadMore, styles.releaseItem)}>
					<Button
						onClick={() => props.next()}
						appearance="ghost"
						tone="gray"
						styles={styles.loadMoreButton}
					>
						{t`Load More`}
					</Button>
				</div>
			</Show>
		</ul>
	)
}

function DiscographyItem(props: { item: Discography }) {
	const context = assertContext(ArtistContext)
	const subtitle = () => {
		const displayArtistName = props.item.artist.some(
			(a) => a.name === context.artist.name,
		)
			? undefined
			: props.item.artist.map((a) => a.name).join(", ")

		const releaseDate = props.item.release_date
			? DateWithPrecision.display(props.item.release_date)
			: undefined
		if (displayArtistName && releaseDate) {
			return `${displayArtistName} · ${releaseDate}`
		}

		if (displayArtistName) {
			return displayArtistName
		}

		if (releaseDate) {
			return releaseDate
		}

		return "N/A"
	}
	return (
		<ItemLayout releaseId={props.item.release_id}>
			<div {...stylex.attrs(styles.releaseTitle)}>{props.item.title}</div>
			<div {...stylex.attrs(styles.subtitle)}>{subtitle()}</div>
		</ItemLayout>
	)
}

function CreditItem(props: { item: ArtistCredit }) {
	return (
		<ItemLayout releaseId={props.item.release_id}>
			<div {...stylex.attrs(styles.creditHeading)}>
				<div {...stylex.attrs(styles.releaseTitle)}>{props.item.title}</div>
				{" · "}
				<ul {...stylex.attrs(styles.creditArtists)}>
					<For each={props.item.artist}>
						{(artist, index) => (
							<li {...stylex.attrs(styles.creditArtist)}>
								{artist.name}
								{index() === props.item.roles.length - 1 ? <></> : " & "}
							</li>
						)}
					</For>
				</ul>
			</div>
			<Show when={props.item.release_date}>
				<div {...stylex.attrs(styles.subtitle)}>
					{DateWithPrecision.display(props.item.release_date!)}
				</div>
			</Show>
			<ul {...stylex.attrs(styles.subtitle, styles.creditHeading)}>
				<For each={props.item.roles}>
					{(role, index) => (
						<li>
							{role.name}
							{index() === props.item.roles.length - 1 ? <></> : ", "}
						</li>
					)}
				</For>
			</ul>
		</ItemLayout>
	)
}

function ItemLayout(props: ParentProps<{ releaseId: number }>) {
	const content = () => (
		<>
			<div {...stylex.attrs(styles.coverPlaceholder)}></div>
			<div {...stylex.attrs(styles.releaseDetails)}>{props.children}</div>
		</>
	)

	return (
		<li {...stylex.attrs(styles.releaseItem)}>
			<Link
				to="/release/$id"
				params={{ id: props.releaseId.toString() }}
				class={stylex.attrs(link.base, styles.releaseLink).class}
			>
				{content()}
			</Link>
		</li>
	)
}
