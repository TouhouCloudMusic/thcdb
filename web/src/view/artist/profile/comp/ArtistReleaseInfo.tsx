/* @refresh skip */
import { msg } from "@lingui/core/macro"
import { Trans, useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { Discography, ReleaseType } from "@thc/api"
import type { JSX } from "solid-js"
import { createMemo, createSignal, For, Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic/Tab"
import { Button } from "~/component/atomic/button"
import { RELEASE_TYPES } from "~/domain/release"
import type { ReleaseListItem } from "~/hey-api"
import { palette } from "~/style/color/palette.stylex"
import { radius, colors, px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"
import { ReleaseItem } from "~/view/release/ReleaseItems"

import { ArtistContext } from ".."
import { ArtistCredits } from "./ArtistCredits"

// TODO: Add links after other pages are completed

const styles = stylex.create({
	grid: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridColumn: "1 / -1",
		minWidth: 0,
	},
	fullWidth: {
		gridColumn: "1 / -1",
		minWidth: 0,
	},
	releasePanel: {
		gridTemplateColumns: `repeat(auto-fill, ${px[8]})`,
		padding: px[16],
	},
	filteredReleases: {
		rowGap: px[16],
	},
	tabTrigger: {
		paddingInline: px[12],
		paddingBlock: px[12],
		color: palette.slate[800],
	},
	releases: {
		rowGap: px[16],
	},
	tabContent: {
		padding: px[16],
	},
	emptyState: {
		gridColumn: "1 / -1",
		display: "flex",
		minHeight: px[256],
		alignItems: "center",
		justifyContent: "center",
		margin: 0,
		paddingInline: px[16],
		paddingBlock: px[24],
		textAlign: "center",
		color: colors.textSecondary,
	},
	uploadLink: {
		color: palette.blue[600],
	},
	releaseTypes: {
		gridColumn: "1 / -1",
		flexWrap: "wrap",
		gap: px[8],
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
	releaseItem: { gridColumn: "1 / -1", minWidth: 0 },
	loadMore: {
		gridColumn: "1 / -1",
		display: "grid",
		justifyItems: "center",
	},
	loadMoreButton: {
		paddingInline: px[64],
		fontWeight: 400,
	},
})

const TABS = [
	"Discography",
	"Appearance",
	"Credit",
	"Comments",
	"Collections",
] as const

const TAB_LABELS = {
	Discography: msg`Discography`,
	Appearance: msg`Appearances`,
	Credit: msg`Credits`,
	Comments: msg`Comments`,
	Collections: msg`Collections`,
}

const RELEASE_TYPE_LABELS = {
	Album: msg`Album`,
	Ep: msg`EP`,
	Single: msg`Single`,
	Compilation: msg`Compilation`,
	Demo: msg`Demo`,
	Other: msg`Other`,
} satisfies Record<ReleaseType, ReturnType<typeof msg>>

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
					!(context.discographies.isLoading || context.appearances.isLoading)
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
	const { t } = useLingui()
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
					return context.credits.hasCredits
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
			{...stylex.attrs(styles.grid)}
		>
			<Tab.ScrollArea styles={styles.fullWidth}>
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
											{t(TAB_LABELS[tabType])}
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

			<Tab.Content
				value="Discography"
				{...stylex.attrs(styles.grid, styles.releasePanel)}
			>
				<DiscographyTab />
			</Tab.Content>
			<Tab.Content
				value="Appearance"
				{...stylex.attrs(styles.grid, styles.releasePanel)}
			>
				<ArtistReleaseList
					data={context.appearances.data}
					hasNext={context.appearances.hasNext}
					next={() => {
						void context.appearances.next()
					}}
				>
					{(itemProps) => <DiscographyItem {...itemProps} />}
				</ArtistReleaseList>
			</Tab.Content>
			<Tab.Content
				value="Credit"
				{...stylex.attrs(styles.grid, styles.releasePanel)}
			>
				<ArtistCredits model={context.credits} />
			</Tab.Content>
			<Tab.Content
				value="Comments"
				{...stylex.attrs(styles.fullWidth, styles.tabContent)}
			>
				<EntityComments model={props.comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				{...stylex.attrs(styles.fullWidth, styles.tabContent)}
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
	const { t } = useLingui()
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
						<Link
							to="/release/new"
							{...stylex.attrs(styles.uploadLink)}
						>
							Upload New Release
						</Link>
					</Trans>
				</p>
			}
		>
			{(type) => (
				<Tab.Root
					value={type()}
					onChange={setSelectedTypeInput}
					{...stylex.attrs(styles.grid, styles.filteredReleases)}
				>
					<Tab.List styles={[styles.releaseTypes]}>
						<For each={existingTypes()}>
							{(releaseType) => (
								<Tab.Trigger
									value={releaseType}
									styles={[styles.releaseType]}
								>
									{t(RELEASE_TYPE_LABELS[releaseType])}
								</Tab.Trigger>
							)}
						</For>
					</Tab.List>

					<ArtistReleaseList
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

function ArtistReleaseList<T extends Discography>(props: {
	data?: T[] | undefined
	hasNext: boolean
	next: () => void
	children: (props: { item: T }) => JSX.Element
}) {
	const { t } = useLingui()

	return (
		<ul {...stylex.attrs(styles.grid, styles.releases)}>
			<For each={props.data}>
				{(release) => props.children({ item: release })}
			</For>

			<Show when={props.hasNext}>
				<li {...stylex.attrs(styles.loadMore)}>
					<Button
						onClick={() => props.next()}
						appearance="ghost"
						tone="gray"
						styles={styles.loadMoreButton}
					>
						{t`Load More`}
					</Button>
				</li>
			</Show>
		</ul>
	)
}

function DiscographyItem(props: { item: Discography }) {
	return (
		<li {...stylex.attrs(styles.releaseItem)}>
			<ReleaseItem release={toReleaseListItem(props.item)} />
		</li>
	)
}

function toReleaseListItem(release: Discography): ReleaseListItem {
	return {
		id: release.release_id,
		title: release.title,
		release_type: release.release_type,
		cover_art_url: release.cover_url,
		release_date: release.release_date,
		artists: release.artist,
		catalog_numbers: [],
	}
}
