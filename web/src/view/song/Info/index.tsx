import type { Song } from "@thc/api"
import { createContext, Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"

import { SongInfoCoverImage } from "./comp/SongInfoCoverImage"
import { SongInfoCredit } from "./comp/SongInfoCredit"
import { SongInfoLanguages } from "./comp/SongInfoLanguages"
import { SongInfoLyrics } from "./comp/SongInfoLyrics"
import { SongInfoRelease } from "./comp/SongInfoRelease"
import { SongInfoTitleAndCreditName } from "./comp/SongInfoTitleAndCreditName"

export type SongInfoPageContext = {
	song: Song
}

export const SongInfoPageContext = createContext<SongInfoPageContext>()

type SongInfoPageProps = {
	song: Song
}

export function SongInfoPage(props: SongInfoPageProps) {
	const contextValue: SongInfoPageContext = {
		get song() {
			return props.song
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>Loading...</div>}>
				<SongInfoPageContext.Provider value={contextValue}>
					<div class="grid grid-cols-[auto_1fr] gap-8">
						<SongInfoCoverImage />
						<div class="flex flex-col gap-y-4">
							<SongInfoTitleAndCreditName />
							<SongInfoLanguages />
						</div>
						<div class="col-span-full">
							<SongInfoTabs />
							<EntityCorrectionMetadataSection
								entityType="song"
								entityId={props.song.id}
							/>
						</div>
					</div>
				</SongInfoPageContext.Provider>
			</Suspense>
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
	return (
		<Tab.Root>
			<Tab.List class="mx-4 grid-cols-3 gap-12 border-b border-slate-200">
				<Tab.Trigger
					value={"Release"}
					class={TRIGGER_CLASS}
				>
					Release
				</Tab.Trigger>
				<Show when={ctx.song.credits}>
					<Tab.Trigger
						value={"Credits"}
						class={TRIGGER_CLASS}
					>
						Credits
					</Tab.Trigger>
				</Show>
				<Show when={ctx.song.lyrics}>
					<Tab.Trigger
						value={"Lyrics"}
						class={TRIGGER_CLASS}
					>
						Lyrics
					</Tab.Trigger>
				</Show>
				<Tab.Indicator />
			</Tab.List>
			<Tab.Content value="Release">
				<SongInfoRelease />
			</Tab.Content>
			<Show when={ctx.song.credits}>
				<Tab.Content value="Credits">
					<SongInfoCredit />
				</Tab.Content>
			</Show>
			<Tab.Content value="Lyrics">
				<SongInfoLyrics />
			</Tab.Content>
		</Tab.Root>
	)
}
