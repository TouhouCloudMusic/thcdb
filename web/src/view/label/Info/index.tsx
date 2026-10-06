import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import type { CorrectionHistoryItem, Label } from "@thc/api"
import { createSignal, Show, Suspense } from "solid-js"

import { Tab } from "~/component/atomic"
import { ExternalLinks } from "~/component/data/ExternalLinks"
import { Intersperse } from "~/component/data/Intersperse"
import { DateWithPrecision } from "~/domain/shared"
import { PageLayout } from "~/layout/PageLayout"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import * as typography from "~/style/typography"
import { assertContext } from "~/utils/solid/assertContext"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCollectionsTab } from "~/view/collection/EntityCollectionsTab"
import { EntityComments } from "~/view/comment/EntityComments"
import { EntityCommentsTabTrigger } from "~/view/comment/EntityCommentsTabTrigger"
import { useEntityComments } from "~/view/comment/useEntityComments"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { entityDetailStyles } from "~/view/entity/detailStyles"

import { LabelInfoPageContext } from "./context"
import type { LabelInfoPageContextValue } from "./context"

const styles = stylex.create({
	page: { padding: "clamp(1rem,4vw,2rem)" },
	content: {
		display: "flex",
		flexDirection: "column",
		rowGap: px[24],
	},
	details: {
		display: "grid",
		gridTemplateColumns: "auto 1fr",
		columnGap: px[16],
		rowGap: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	detailLabel: { color: colors.textTertiary },
	localizedNames: {
		display: "flex",
		flexWrap: "wrap",
		gap: px[2],
		whiteSpace: "pre",
	},
	separator: { whiteSpace: "pre" },
	detailText: { color: colors.textSecondary },
	founders: {
		display: "flex",
		flexWrap: "wrap",
		gap: px[2],
		whiteSpace: "pre",
	},
	tabPanel: { padding: px[16] },
})

type Props = {
	label: Label
	correctionHistory: CorrectionHistoryItem[]
}

export function LabelInfoPage(props: Props) {
	const { t } = useLingui()
	const contextValue: LabelInfoPageContextValue = {
		get label() {
			return props.label
		},
	}

	return (
		<PageLayout styles={styles.page}>
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<LabelInfoPageContext.Provider value={contextValue}>
					<div {...stylex.attrs(styles.content)}>
						<LabelInfoHeader />
						<LabelInfoDetails />
						<div {...stylex.attrs(entityDetailStyles.collectionActions)}>
							<AddToUserCollectionButton
								entityType="Label"
								entityId={props.label.id}
							/>
						</div>
						<LabelInfoComments />
						<EntityCorrectionMetadataSection
							entityType="label"
							entityId={props.label.id}
							correctionHistory={props.correctionHistory}
						/>
					</div>
				</LabelInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}

function LabelInfoHeader() {
	const ctx = assertContext(LabelInfoPageContext)
	return (
		<header>
			<h1 {...stylex.attrs(typography.heading.md)}>{ctx.label.name}</h1>
		</header>
	)
}

function LabelInfoDetails() {
	const { t } = useLingui()
	const ctx = assertContext(LabelInfoPageContext)
	const hasLocalizedNames = () => ctx.label.localized_names.length > 0
	const hasFounders = () => ctx.label.founders.length > 0
	const founded = () => DateWithPrecision.display(ctx.label.founded_date)
	const dissolved = () => DateWithPrecision.display(ctx.label.dissolved_date)

	return (
		<div {...stylex.attrs(styles.details)}>
			<Show when={founded()}>
				<span {...stylex.attrs(styles.detailLabel)}>{t`Founded`}</span>
				<span>{founded()}</span>
			</Show>
			<Show when={dissolved()}>
				<span {...stylex.attrs(styles.detailLabel)}>{t`Dissolved`}</span>
				<span>{dissolved()}</span>
			</Show>
			<Show when={hasLocalizedNames()}>
				<span {...stylex.attrs(styles.detailLabel)}>{t`Localized Names`}</span>
				<ul {...stylex.attrs(styles.localizedNames)}>
					<Intersperse
						of={ctx.label.localized_names}
						with={<span {...stylex.attrs(styles.separator)}>, </span>}
					>
						{(item) => (
							<li {...stylex.attrs(styles.detailText)}>
								{item.name} ({item.language.code})
							</li>
						)}
					</Intersperse>
				</ul>
			</Show>
			<Show when={hasFounders()}>
				<span {...stylex.attrs(styles.detailLabel)}>{t`Founders`}</span>
				<ul {...stylex.attrs(styles.founders)}>
					<Intersperse
						of={ctx.label.founders}
						with={<span {...stylex.attrs(styles.separator)}>, </span>}
					>
						{(id) => <li {...stylex.attrs(styles.detailText)}>#{id}</li>}
					</Intersperse>
				</ul>
			</Show>
			<ExternalLinks links={ctx.label.links} />
		</div>
	)
}

function LabelInfoComments() {
	const { t } = useLingui()
	const ctx = assertContext(LabelInfoPageContext)
	const [activeTab, setActiveTab] = createSignal("Comments")
	const comments = useEntityComments(() => ({
		entityType: "label",
		entityId: ctx.label.id,
		listEnabled: activeTab() === "Comments",
	}))

	return (
		<Tab.Root
			value={activeTab()}
			onChange={setActiveTab}
		>
			<Tab.ScrollArea>
				<Tab.List styles={Tab.containerStyles}>
					<EntityCommentsTabTrigger count={comments.activeCommentCount()} />
					<Tab.Trigger value="Collections">{t`Collections`}</Tab.Trigger>
					<Tab.Indicator />
				</Tab.List>
			</Tab.ScrollArea>
			<Tab.Content
				value="Comments"
				{...stylex.attrs(styles.tabPanel)}
			>
				<EntityComments model={comments} />
			</Tab.Content>
			<Tab.Content
				value="Collections"
				{...stylex.attrs(styles.tabPanel)}
			>
				<EntityCollectionsTab
					entityType="label"
					entityId={ctx.label.id}
					enabled={activeTab() === "Collections"}
				/>
			</Tab.Content>
		</Tab.Root>
	)
}
