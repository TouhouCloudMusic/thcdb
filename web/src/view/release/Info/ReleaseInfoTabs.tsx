import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { Release } from "@thc/api"
import { createMemo, createSignal, Show, untrack } from "solid-js"

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
	tabPanel: { paddingBlock: px[16] },
	creditsPanel: { padding: px[16] },
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

function releaseHasTracks(release: Release) {
	return (release.tracks?.length ?? 0) > 0
}

function releaseHasCredits(release: Release) {
	return release.credits?.some((credit) => credit.on === null) ?? false
}

function defaultActiveTab(release: Release) {
	return releaseHasTracks(release)
		? "Tracks"
		: releaseHasCredits(release)
			? "Credits"
			: "Comments"
}

export function ReleaseInfoTabs(props: ReleaseInfoTabsProps) {
	const [selectedTab, setSelectedTab] = createSignal(
		untrack(() => defaultActiveTab(props.release)),
	)
	const activeTab = createMemo(() => {
		const selected = selectedTab()
		return selected === "Credits" && !releaseHasCredits(props.release)
			? defaultActiveTab(props.release)
			: selected
	})
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
			onActiveTabChange={setSelectedTab}
		/>
	)
}

export function ReleaseInfoTabsView(props: ReleaseInfoTabsViewProps) {
	const { t } = useLingui()

	return (
		<Tab.Root
			value={props.activeTab}
			onChange={props.onActiveTabChange}
		>
			<Tab.ScrollArea>
				<Tab.List styles={Tab.containerStyles}>
					<Tab.Trigger value="Tracks">{t`Tracks`}</Tab.Trigger>
					<Show when={releaseHasCredits(props.release)}>
						<Tab.Trigger value="Credits">{t`Credits`}</Tab.Trigger>
					</Show>
					<EntityCommentsTabTrigger
						count={props.comments.activeCommentCount()}
					/>
					<Tab.Trigger value="Collections">{t`Collections`}</Tab.Trigger>
					<Tab.Indicator />
				</Tab.List>
			</Tab.ScrollArea>
			<Tab.Content
				value="Tracks"
				{...stylex.attrs(styles.tabPanel)}
			>
				<ReleaseInfoTracks
					discs={props.release.discs}
					tracks={props.release.tracks}
					credits={props.release.credits}
				/>
			</Tab.Content>
			<Show when={releaseHasCredits(props.release)}>
				<Tab.Content
					value="Credits"
					{...stylex.attrs(styles.creditsPanel)}
				>
					<ReleaseInfoCredits credits={props.release.credits} />
				</Tab.Content>
			</Show>
			<Tab.Content
				value="Comments"
				{...stylex.attrs(styles.tabPanel)}
			>
				<EntityComments model={props.comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				{...stylex.attrs(styles.tabPanel)}
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
