import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { CorrectionHistoryItem, Song } from "@thc/api"
import { createContext, createSignal, Show } from "solid-js"

import { Tab } from "~/component/atomic"
import { ExternalLinks } from "~/component/data/ExternalLinks"
import { PageLayout } from "~/layout/PageLayout"
import { px } from "~/style/tokens.stylex"
import { assertContext } from "~/utils/solid/assertContext"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { entityDetailStyles } from "~/view/entity/detailStyles"
import { EntityTags } from "~/view/entity_tags/EntityTags"

import { SongInfoCoverImage } from "./comp/SongInfoCoverImage"
import { SongInfoCredit } from "./comp/SongInfoCredit"
import { SongInfoLanguages } from "./comp/SongInfoLanguages"
import { SongInfoLyrics } from "./comp/SongInfoLyrics"
import { SongInfoRelations } from "./comp/SongInfoRelations"
import { SongInfoRelease } from "./comp/SongInfoRelease"
import { SongInfoTitleAndCreditName } from "./comp/SongInfoTitleAndCreditName"

const styles = stylex.create({
	page: {
		padding: "clamp(1rem,4vw,2rem)",
	},
	content: {
		display: "flex",
		flexDirection: "column",
		gap: px[32],
	},
	overview: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "flex-start",
		justifyContent: "center",
		gap: px[24],
	},
	details: {
		display: "flex",
		minWidth: 0,
		flex: "1",
		flexBasis: px[288],
		flexDirection: "column",
		rowGap: px[16],
	},
	tabTrigger: {
		paddingBlock: px[12],
	},
	tabContent: {
		padding: px[16],
	},
})

export type SongInfoPageContext = {
	song: Song
}

export const SongInfoPageContext = createContext<SongInfoPageContext>()

type SongInfoPageProps = {
	song: Song
	correctionHistory: CorrectionHistoryItem[]
}

type SongInfoPageViewProps = SongInfoPageProps & {
	activeTab: string
	comments: EntityCommentsModel
	onActiveTabChange: (value: string) => void
}

export function SongInfoPage(props: SongInfoPageProps) {
	const [activeTab, setActiveTab] = createSignal("Release")
	const comments = useEntityComments(() => ({
		entityType: "song",
		entityId: props.song.id,
		listEnabled: activeTab() === "Comments",
	}))

	return (
		<SongInfoPageView
			song={props.song}
			correctionHistory={props.correctionHistory}
			activeTab={activeTab()}
			comments={comments}
			onActiveTabChange={setActiveTab}
		/>
	)
}

export function SongInfoPageView(props: SongInfoPageViewProps) {
	const contextValue: SongInfoPageContext = {
		get song() {
			return props.song
		},
	}

	return (
		<PageLayout styles={[styles.page]}>
			<SongInfoPageContext.Provider value={contextValue}>
				<div {...stylex.attrs(styles.content)}>
					<div {...stylex.attrs(styles.overview)}>
						<SongInfoCoverImage />
						<div {...stylex.attrs(styles.details)}>
							<SongInfoTitleAndCreditName />
							<SongInfoLanguages />
							<ExternalLinks links={props.song.links} />
							<EntityTags
								entityType="song"
								entityId={props.song.id}
							/>
							<div {...stylex.attrs(entityDetailStyles.collectionActions)}>
								<AddToUserCollectionButton
									entityType="Song"
									entityId={props.song.id}
								/>
							</div>
						</div>
					</div>
					<SongInfoTabsView
						activeTab={props.activeTab}
						comments={props.comments}
						onActiveTabChange={props.onActiveTabChange}
					/>
					<EntityCorrectionMetadataSection
						entityType="song"
						entityId={props.song.id}
						correctionHistory={props.correctionHistory}
					/>
				</div>
			</SongInfoPageContext.Provider>
		</PageLayout>
	)
}

// TODO: Fix primary color.

type SongInfoTabsViewProps = {
	activeTab: string
	comments: EntityCommentsModel
	onActiveTabChange: (value: string) => void
}

export function SongInfoTabsView(props: SongInfoTabsViewProps) {
	const { t } = useLingui()
	const ctx = assertContext(SongInfoPageContext)
	const hasCredits = () =>
		Boolean(ctx.song.credits && ctx.song.credits.length > 0)
	const hasLyrics = () => Boolean(ctx.song.lyrics && ctx.song.lyrics.length > 0)
	const hasRelations = () =>
		Boolean(ctx.song.relations && ctx.song.relations.length > 0)

	return (
		<Tab.Root
			value={props.activeTab}
			onChange={props.onActiveTabChange}
		>
			<Tab.ScrollArea>
				<Tab.List styles={[Tab.containerStyles]}>
					<Tab.Trigger
						value="Release"
						styles={[styles.tabTrigger]}
					>
						{t`Release`}
					</Tab.Trigger>
					<Show when={hasCredits()}>
						<Tab.Trigger
							value="Credits"
							styles={[styles.tabTrigger]}
						>
							{t`Credits`}
						</Tab.Trigger>
					</Show>
					<Show when={hasLyrics()}>
						<Tab.Trigger
							value="Lyrics"
							styles={[styles.tabTrigger]}
						>
							{t`Lyrics`}
						</Tab.Trigger>
					</Show>
					<Show when={hasRelations()}>
						<Tab.Trigger
							value="Relations"
							styles={[styles.tabTrigger]}
						>
							{t`Relations`}
						</Tab.Trigger>
					</Show>
					<EntityCommentsTabTrigger
						count={props.comments.activeCommentCount()}
						styles={[styles.tabTrigger]}
					/>
					<Tab.Trigger
						value="Collections"
						styles={[styles.tabTrigger]}
					>
						{t`Collections`}
					</Tab.Trigger>
					<Tab.Indicator />
				</Tab.List>
			</Tab.ScrollArea>
			<Tab.Content value="Release">
				<SongInfoRelease />
			</Tab.Content>
			<Show when={hasCredits()}>
				<Tab.Content value="Credits">
					<SongInfoCredit />
				</Tab.Content>
			</Show>
			<Show when={hasLyrics()}>
				<Tab.Content value="Lyrics">
					<SongInfoLyrics />
				</Tab.Content>
			</Show>
			<Show when={hasRelations()}>
				<Tab.Content value="Relations">
					<SongInfoRelations relations={ctx.song.relations ?? []} />
				</Tab.Content>
			</Show>
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
					entityType="song"
					entityId={ctx.song.id}
					enabled={props.activeTab === "Collections"}
				/>
			</Tab.Content>
		</Tab.Root>
	)
}
