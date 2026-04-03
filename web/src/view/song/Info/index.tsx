import type { CorrectionHistoryItem, Song } from "@thc/api"
import { createContext, Show } from "solid-js"

import { Tab } from "~/component/atomic"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"

import { SongInfoCoverImage } from "./comp/SongInfoCoverImage"
import { SongInfoCredit } from "./comp/SongInfoCredit"
import { SongInfoLanguages } from "./comp/SongInfoLanguages"
import { SongInfoLyrics } from "./comp/SongInfoLyrics"
import { SongInfoRelations } from "./comp/SongInfoRelations"
import { SongInfoRelease } from "./comp/SongInfoRelease"
import { SongInfoTitleAndCreditName } from "./comp/SongInfoTitleAndCreditName"

export type SongInfoPageContext = {
	song: Song
}

export const SongInfoPageContext = createContext<SongInfoPageContext>()

type SongInfoPageProps = {
	song: Song
	correctionHistory: CorrectionHistoryItem[]
}

export function SongInfoPage(props: SongInfoPageProps) {
	const contextValue: SongInfoPageContext = {
		get song() {
			return props.song
		},
	}

	return (
		<PageLayout class="p-8">
			<SongInfoPageContext.Provider value={contextValue}>
				<div class="grid grid-cols-[auto_1fr] gap-8">
					<SongInfoCoverImage />
					<div class="flex flex-col gap-y-4">
						<SongInfoTitleAndCreditName />
						<SongInfoLanguages />
					</div>
					<div class="col-span-full flex flex-col gap-8">
						<SongInfoTabs />
						<EntityCorrectionMetadataSection
							entityType="song"
							entityId={props.song.id}
							correctionHistory={props.correctionHistory}
						/>
					</div>
				</div>
			</SongInfoPageContext.Provider>
		</PageLayout>
	)
}

// TODO:
// - sync tabs style for other info page
// - fix primary color
//

const TRIGGER_CLASS = "py-4"
function SongInfoTabs() {
	const ctx = assertContext(SongInfoPageContext)
	const hasCredits = () =>
		Boolean(ctx.song.credits && ctx.song.credits.length > 0)
	const hasLyrics = () => Boolean(ctx.song.lyrics && ctx.song.lyrics.length > 0)
	const hasRelations = () =>
		Boolean(ctx.song.relations && ctx.song.relations.length > 0)
	return (
		<Tab.Root>
			<Tab.List class="mx-4 gap-12 border-b border-slate-200">
				<Tab.Trigger
					value={"Release"}
					class={TRIGGER_CLASS}
				>
					Release
				</Tab.Trigger>
				<Show when={hasCredits()}>
					<Tab.Trigger
						value={"Credits"}
						class={TRIGGER_CLASS}
					>
						Credits
					</Tab.Trigger>
				</Show>
				<Show when={hasLyrics()}>
					<Tab.Trigger
						value={"Lyrics"}
						class={TRIGGER_CLASS}
					>
						Lyrics
					</Tab.Trigger>
				</Show>
				<Show when={hasRelations()}>
					<Tab.Trigger
						value={"Relations"}
						class={TRIGGER_CLASS}
					>
						Relations
					</Tab.Trigger>
				</Show>
				<Tab.Indicator />
			</Tab.List>
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
		</Tab.Root>
	)
}
