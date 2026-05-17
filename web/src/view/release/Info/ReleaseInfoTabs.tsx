import { useLingui } from "@lingui/solid/macro"
import type { Release } from "@thc/api"
import { createSignal, Show } from "solid-js"

import { Tab } from "~/component/atomic"
import { EntityComments } from "~/view/comment/EntityComments"
import { createEntityCommentsController } from "~/view/comment/EntityCommentsController"
import type { EntityCommentsController } from "~/view/comment/EntityCommentsController"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"

import { ReleaseInfoCredits } from "./comp/ReleaseInfoCredits"
import { ReleaseInfoTracks } from "./comp/ReleaseInfoTracks"

type ReleaseInfoTabsProps = {
	release: Release
}

type ReleaseInfoTabsViewProps = {
	release: Release
	activeTab: string
	comments: EntityCommentsController
	onActiveTabChange: (value: string) => void
}

const TRIGGER_CLASS = "py-4"

export function ReleaseInfoTabs(props: ReleaseInfoTabsProps) {
	const hasTracks = () => (props.release.tracks?.length ?? 0) > 0
	const hasCredits = () => (props.release.credits?.length ?? 0) > 0
	const [activeTab, setActiveTab] = createSignal(
		hasTracks() ? "Tracks" : hasCredits() ? "Credits" : "Comments",
	)
	const comments = createEntityCommentsController(() => ({
		entityType: "release",
		entityId: props.release.id,
		listEnabled: activeTab() === "Comments",
	}))

	return (
		<ReleaseInfoTabsView
			release={props.release}
			activeTab={activeTab()}
			comments={comments}
			onActiveTabChange={setActiveTab}
		/>
	)
}

export function ReleaseInfoTabsView(props: ReleaseInfoTabsViewProps) {
	const { t } = useLingui()
	const hasTracks = () => (props.release.tracks?.length ?? 0) > 0
	const hasCredits = () => (props.release.credits?.length ?? 0) > 0

	return (
		<Tab.Root
			value={props.activeTab}
			onChange={props.onActiveTabChange}
		>
			<div class="border-b border-slate-300 px-4">
				<Tab.List class="gap-12">
					<Show when={hasTracks()}>
						<Tab.Trigger
							value="Tracks"
							class={TRIGGER_CLASS}
						>
							{t`Tracks`}
						</Tab.Trigger>
					</Show>
					<Show when={hasCredits()}>
						<Tab.Trigger
							value="Credits"
							class={TRIGGER_CLASS}
						>
							{t`Credits`}
						</Tab.Trigger>
					</Show>
					<EntityCommentsTabTrigger
						count={props.comments.activeCommentCount()}
						class={TRIGGER_CLASS}
					/>
					<Tab.Indicator />
				</Tab.List>
			</div>
			<Show when={hasTracks()}>
				<Tab.Content
					value="Tracks"
					class="p-4"
				>
					<ReleaseInfoTracks
						discs={props.release.discs}
						tracks={props.release.tracks}
					/>
				</Tab.Content>
			</Show>
			<Show when={hasCredits()}>
				<Tab.Content
					value="Credits"
					class="p-4"
				>
					<ReleaseInfoCredits credits={props.release.credits} />
				</Tab.Content>
			</Show>
			<Tab.Content
				value="Comments"
				class="p-4"
			>
				<EntityComments controller={props.comments} />
			</Tab.Content>
		</Tab.Root>
	)
}
