import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { Release } from "@thc/api"
import { createSignal } from "solid-js"

import { Tab } from "~/component/atomic"
import { fontSizes, px } from "~/style/tokens.stylex"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import type { EntityCommentsModel } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"

import { ReleaseInfoTracks } from "./comp/ReleaseInfoTracks"

// TODO: Unify tabs styles
const styles = stylex.create({
	tabTrigger: {
		paddingBlock: px[16],
		fontSize: fontSizes.sm,
	},
	tabPanel: { paddingBlock: px[16] },
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
	const [activeTab, setActiveTab] = createSignal("Tracks")
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

	return (
		<Tab.Root
			value={props.activeTab}
			onChange={props.onActiveTabChange}
		>
			<Tab.ScrollArea>
				<Tab.List styles={Tab.containerStyles}>
					<Tab.Trigger
						value="Tracks"
						styles={styles.tabTrigger}
					>
						{t`Tracks`}
					</Tab.Trigger>
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
