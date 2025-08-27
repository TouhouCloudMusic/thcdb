import { Trans } from "@lingui-solid/solid/macro"
import type { Song } from "@thc/api"
import { createContext, Show, Suspense } from "solid-js"

import { Tab } from "~/components/atomic"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"

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
					<Trans>Release</Trans>
				</Tab.Trigger>
				<Tab.Trigger
					value={"Credits"}
					class={TRIGGER_CLASS}
				>
					<Trans>Credits</Trans>
				</Tab.Trigger>
				<Show when={ctx.song.lyrics}>
					<Tab.Trigger
						value={"Lyrics"}
						class={TRIGGER_CLASS}
					>
						<Trans>Lyrics</Trans>
					</Tab.Trigger>
				</Show>
				<Tab.Indicator />
			</Tab.List>
			<Tab.Content value="Release">
				<SongInfoRelease />
			</Tab.Content>
			<Tab.Content value="Credits">
				<SongInfoCredit />
			</Tab.Content>
			<Tab.Content value="Lyrics">
				<SongInfoLyrics />
			</Tab.Content>
		</Tab.Root>
	)
}
