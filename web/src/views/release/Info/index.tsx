import type { Release } from "@thc/api"
import { Show, Suspense } from "solid-js"

import { Tab } from "~/components/atomic"
import { PageLayout } from "~/layout/PageLayout"
import { assertContext } from "~/utils/solid/assertContext"

import { ReleaseInfoCoverImage } from "./comp/ReleaseInfoCoverImage"
import { ReleaseInfoCredits } from "./comp/ReleaseInfoCredits"
import { ReleaseInfoDetails } from "./comp/ReleaseInfoDetails"
import { ReleaseInfoTitleAndArtist } from "./comp/ReleaseInfoTitleAndArtist"
import { ReleaseInfoTracks } from "./comp/ReleaseInfoTracks"
import { ReleaseInfoPageContext } from "./context"

type ReleaseInfoPageProps = {
	release: Release
}

export function ReleaseInfoPage(props: ReleaseInfoPageProps) {
	const contextValue: ReleaseInfoPageContext = {
		get release() {
			return props.release
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>Loading...</div>}>
				<ReleaseInfoPageContext.Provider value={contextValue}>
					<div class="grid grid-cols-[auto_1fr] gap-8">
						<ReleaseInfoCoverImage />
						<div class="flex flex-col gap-y-4">
							<ReleaseInfoTitleAndArtist />
							<ReleaseInfoDetails />
						</div>
						<div class="col-span-full">
							<ReleaseInfoTabs />
						</div>
					</div>
				</ReleaseInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}

const TRIGGER_CLASS = "py-4"
function ReleaseInfoTabs() {
	const ctx = assertContext(ReleaseInfoPageContext)
	return (
		<Tab.Root>
			<div class="border-b border-slate-300 px-4">
				<Tab.List class="grid-cols-2 gap-12">
					<Show when={ctx.release.tracks && ctx.release.tracks.length > 0}>
						<Tab.Trigger
							value={"Tracks"}
							class={TRIGGER_CLASS}
						>
							Tracks
						</Tab.Trigger>
					</Show>
					<Show when={ctx.release.credits && ctx.release.credits.length > 0}>
						<Tab.Trigger
							value={"Credits"}
							class={TRIGGER_CLASS}
						>
							Credits
						</Tab.Trigger>
					</Show>
					<Tab.Indicator />
				</Tab.List>
			</div>
			<Show when={ctx.release.tracks?.length}>
				<Tab.Content
					value="Tracks"
					class="p-4"
				>
					<ReleaseInfoTracks />
				</Tab.Content>
			</Show>
			<Tab.Content
				value="Credits"
				class="p-4"
			>
				<ReleaseInfoCredits />
			</Tab.Content>
		</Tab.Root>
	)
}
