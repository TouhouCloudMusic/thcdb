import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { Release } from "@thc/api"
import { createSignal, Show } from "solid-js"

import { Tab } from "~/component/atomic"
import { px } from "~/style/tokens.stylex"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"

import { ReleaseInfoCredits } from "./comp/ReleaseInfoCredits"
import { ReleaseInfoTracks } from "./comp/ReleaseInfoTracks"

const styles = stylex.create({
	tabTrigger: { paddingBlock: px[12] },
	tabPanel: { padding: px[16] },
})

type ReleaseInfoTabsProps = {
	release: Release
}

type ReleaseInfoTabsViewProps = {
	release: Release
	activeTab: string
	comments: EntityCommentsModel
	onActiveTabChange: (value: string) => void
}

export function ReleaseInfoTabs(props: ReleaseInfoTabsProps) {
	const hasTracks = () => (props.release.tracks?.length ?? 0) > 0
	const hasCredits = () => (props.release.credits?.length ?? 0) > 0
	const [activeTab, setActiveTab] = createSignal(
		hasTracks() ? "Tracks" : hasCredits() ? "Credits" : "Comments",
	)
	const comments = useEntityComments(() => ({
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
			<Tab.ScrollArea>
				<Tab.List styles={Tab.containerStyles}>
					<Show when={hasTracks()}>
						<Tab.Trigger
							value="Tracks"
							styles={styles.tabTrigger}
						>
							{t`Tracks`}
						</Tab.Trigger>
					</Show>
					<Show when={hasCredits()}>
						<Tab.Trigger
							value="Credits"
							styles={styles.tabTrigger}
						>
							{t`Credits`}
						</Tab.Trigger>
					</Show>
					<EntityCommentsTabTrigger
						count={props.comments.activeCommentCount()}
						styles={styles.tabTrigger}
					/>
					<Tab.Trigger
						value="Collections"
						styles={styles.tabTrigger}
					>
						{t`Collections`}
					</Tab.Trigger>
					<Tab.Indicator />
				</Tab.List>
			</Tab.ScrollArea>
			<Show when={hasTracks()}>
				<Tab.Content
					value="Tracks"
					styles={styles.tabPanel}
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
					styles={styles.tabPanel}
				>
					<ReleaseInfoCredits credits={props.release.credits} />
				</Tab.Content>
			</Show>
			<Tab.Content
				value="Comments"
				styles={styles.tabPanel}
			>
				<EntityComments model={props.comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				styles={styles.tabPanel}
			>
				<EntityCollectionsTab
					entityType="release"
					entityId={props.release.id}
					enabled={props.activeTab === "Collections"}
				/>
			</Tab.Content>
		</Tab.Root>
	)
}
