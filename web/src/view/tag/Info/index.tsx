import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { CorrectionHistoryItem, Tag } from "@thc/api"
import { createSignal, Match, Suspense, Switch } from "solid-js"

import { Tab } from "~/component/atomic/Tab"
import { Select, underlineSelectStyles } from "~/component/atomic/form/select"
import type {
	EntityUserCollectionSort,
	ReleaseListItem,
	SongListing,
	UserCollection,
} from "~/hey-api"
import { PageLayout } from "~/layout/PageLayout"
import { copyStyles, textStyles } from "~/style"
import { palette } from "~/style/color/palette.stylex"
import { listItemStyles } from "~/style/primitives"
import { px } from "~/style/tokens.stylex"
import { CollectionListItem } from "~/view/collection/CollectionListItem"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { ReleaseItem } from "~/view/release/ReleaseItems"
import { SongItem } from "~/view/song/SongItem"

import { TagInfoOverview } from "./Overview"
import { TagInfoPageContext } from "./context"
import type { TagInfoPageContextValue } from "./context"
import { TagResultsSection } from "./results"
import type { TagResultsStore } from "./results"

function renderCollection(collection: UserCollection) {
	return (
		<CollectionListItem.Root styles={listItemStyles.content}>
			<CollectionListItem.Name
				id={collection.id}
				styles={textStyles.ellipsis}
			>
				{collection.name}
			</CollectionListItem.Name>
			<CollectionListItem.Metadata>
				<CollectionListItem.Owner
					name={collection.owner.name}
					styles={textStyles.ellipsis}
				/>
				<CollectionListItem.ItemCount value={collection.item_count} />
			</CollectionListItem.Metadata>
			<CollectionListItem.Description
				styles={[copyStyles.sm, textStyles.ellipsis]}
			>
				{collection.description}
			</CollectionListItem.Description>
		</CollectionListItem.Root>
	)
}

export type TagCollectionsStore = TagResultsStore<UserCollection> & {
	sortBy: EntityUserCollectionSort
	setSortBy: (sort: EntityUserCollectionSort) => void
}

type SortableTagResultsStore<T> = TagResultsStore<T> & {
	sortBy: TagEntitySort
	setSortBy: (sort: TagEntitySort) => void
}

type Props = {
	tag: Tag
	correctionHistory: CorrectionHistoryItem[]
	releases: SortableTagResultsStore<ReleaseListItem>
	songs: SortableTagResultsStore<SongListing>
	collections: TagCollectionsStore
}

export type TagEntitySort = "popular" | "release_date"

const pageStyles = stylex.create({
	page: {
		"--page-width": px[1280],
		borderInlineWidth: 0,
		padding: px[32],
	},
	pageContent: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr)",
		columnGap: px[64],
		rowGap: px[32],
		alignItems: "start",
	},
	fullWidth: {
		gridColumn: "1 / -1",
	},
	referencingEntities: {
		display: "grid",
		gridColumn: "1 / -1",
		gridTemplateColumns: "subgrid",
		rowGap: px[16],
	},
})

const sortStyles = stylex.create({
	trigger: { height: px[32], paddingBlock: 0 },
	text: {
		fontWeight: 300,
	},
})

const tabsStyles = stylex.create({
	root: {
		display: "grid",
		gridTemplateColumns: "minmax(0, 1fr) auto",
		columnGap: px[8],
		alignItems: "stretch",
		height: "calc(2rem + 1px)",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderColor: palette.slate[300],
	},
	content: {
		paddingTop: px[8],
	},
})

function EntitySortSelect(props: {
	store: SortableTagResultsStore<ReleaseListItem | SongListing>
	label: string
}) {
	const { t } = useLingui()
	return (
		<Select.Root<TagEntitySort>
			options={["popular", "release_date"]}
			optionTextValue={(value) =>
				value === "popular" ? t`Popular` : t`Release date`
			}
			value={props.store.sortBy}
			onChange={(value) => {
				if (value !== null) props.store.setSortBy(value)
			}}
			placeholder={t`Sort`}
			itemComponent={(itemProps) => (
				<Select.Item
					item={itemProps.item}
					styles={[underlineSelectStyles.item, sortStyles.text]}
				>
					{itemProps.item.rawValue === "popular" ? t`Popular` : t`Release date`}
				</Select.Item>
			)}
		>
			<Select.Trigger
				aria-label={props.label}
				styles={[
					underlineSelectStyles.trigger,
					sortStyles.trigger,
					sortStyles.text,
				]}
			>
				<Select.Value<TagEntitySort>>
					{(state) =>
						state.selectedOption() === "popular"
							? t`Sort: Popular`
							: t`Sort: Release date`
					}
				</Select.Value>
				<Select.Icon />
			</Select.Trigger>
			<Select.Portal>
				<Select.Content styles={underlineSelectStyles.content}>
					<Select.Listbox styles={underlineSelectStyles.listbox} />
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	)
}

function CollectionSortSelect(props: { store: TagCollectionsStore }) {
	const { t } = useLingui()
	return (
		<Select.Root<EntityUserCollectionSort>
			options={["collected_at", "follower_count"]}
			optionTextValue={(value) =>
				value === "collected_at" ? t`Collected time` : t`Follow count`
			}
			value={props.store.sortBy}
			onChange={(value) => {
				if (value !== null) props.store.setSortBy(value)
			}}
			placeholder={t`Sort`}
			itemComponent={(itemProps) => (
				<Select.Item
					item={itemProps.item}
					styles={[underlineSelectStyles.item, sortStyles.text]}
				>
					{itemProps.item.rawValue === "collected_at"
						? t`Collected time`
						: t`Follow count`}
				</Select.Item>
			)}
		>
			<Select.Trigger
				aria-label={t`Sort collections`}
				styles={[
					underlineSelectStyles.trigger,
					sortStyles.trigger,
					sortStyles.text,
				]}
			>
				<Select.Value<EntityUserCollectionSort>>
					{(state) =>
						state.selectedOption() === "collected_at"
							? t`Sort: Collected time`
							: t`Sort: Follow count`
					}
				</Select.Value>
				<Select.Icon />
			</Select.Trigger>
			<Select.Portal>
				<Select.Content styles={underlineSelectStyles.content}>
					<Select.Listbox styles={underlineSelectStyles.listbox} />
				</Select.Content>
			</Select.Portal>
		</Select.Root>
	)
}

export function TagInfoPage(props: Props) {
	const { t } = useLingui()
	const [activeTab, setActiveTab] = createSignal("release")
	const contextValue: TagInfoPageContextValue = {
		get tag() {
			return props.tag
		},
	}

	return (
		<PageLayout styles={pageStyles.page}>
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<TagInfoPageContext.Provider value={contextValue}>
					<div {...stylex.attrs(pageStyles.pageContent)}>
						<TagInfoOverview />
						<div {...stylex.attrs(pageStyles.referencingEntities)}>
							<Tab.Root
								value={activeTab()}
								onChange={setActiveTab}
							>
								<div {...stylex.attrs(tabsStyles.root)}>
									<Tab.ScrollArea>
										<Tab.List styles={Tab.containerStyles}>
											<Tab.Trigger value="release">{t`Releases`}</Tab.Trigger>

											<Tab.Trigger value="song">{t`Songs`}</Tab.Trigger>

											<Tab.Trigger value="collection">
												{t`Collections`}
											</Tab.Trigger>

											<Tab.Indicator />
										</Tab.List>
									</Tab.ScrollArea>

									<Switch>
										<Match when={activeTab() === "release"}>
											<EntitySortSelect
												store={props.releases}
												label={t`Sort releases`}
											/>
										</Match>
										<Match when={activeTab() === "song"}>
											<EntitySortSelect
												store={props.songs}
												label={t`Sort songs`}
											/>
										</Match>
										<Match when={activeTab() === "collection"}>
											<CollectionSortSelect store={props.collections} />
										</Match>
									</Switch>
								</div>
								<Tab.Content
									value="release"
									class={stylex.attrs(tabsStyles.content).class}
								>
									<TagResultsSection
										title={t`Releases`}
										emptyMessage={t`No releases use this tag`}
										store={props.releases}
										renderItem={(release) => <ReleaseItem release={release} />}
									/>
								</Tab.Content>
								<Tab.Content
									value="song"
									class={stylex.attrs(tabsStyles.content).class}
								>
									<TagResultsSection
										title={t`Songs`}
										emptyMessage={t`No songs use this tag`}
										store={props.songs}
										renderItem={(song) => <SongItem song={song} />}
									/>
								</Tab.Content>
								<Tab.Content
									value="collection"
									class={stylex.attrs(tabsStyles.content).class}
								>
									<TagResultsSection
										title={t`Collections`}
										emptyMessage={t`No collections`}
										store={props.collections}
										renderItem={renderCollection}
									/>
								</Tab.Content>
							</Tab.Root>
						</div>
						<div {...stylex.attrs(pageStyles.fullWidth)}>
							<EntityCorrectionMetadataSection
								entityType="tag"
								entityId={props.tag.id}
								correctionHistory={props.correctionHistory}
							/>
						</div>
					</div>
				</TagInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}
