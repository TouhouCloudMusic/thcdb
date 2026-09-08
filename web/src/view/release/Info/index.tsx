import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type { CorrectionHistoryItem, Release } from "@thc/api"
import { Suspense } from "solid-js"

import { buttonStyles } from "~/component/atomic/button"
import { PageLayout } from "~/layout/PageLayout"
import { link } from "~/style/link"
import { lineHeights, fontSizes, px } from "~/style/tokens.stylex"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { entityDetailStyles } from "~/view/entity/detailStyles"
import { EntityTags } from "~/view/entity_tags/EntityTags"

import { ReleaseInfoTabs } from "./ReleaseInfoTabs"
import { ReleaseInfoCoverImage } from "./comp/ReleaseInfoCoverImage"
import { ReleaseInfoDetails } from "./comp/ReleaseInfoDetails"
import { ReleaseInfoTitleAndArtist } from "./comp/ReleaseInfoTitleAndArtist"
import { ReleaseInfoPageContext } from "./context"

const styles = stylex.create({
	page: { padding: "clamp(1rem,4vw,2rem)" },
	content: {
		display: "flex",
		flexDirection: "column",
		gap: px[32],
	},
	header: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "flex-start",
		justifyContent: "center",
		gap: px[24],
	},
	summary: {
		display: "flex",
		minWidth: "0rem",
		flex: "1",
		flexBasis: px[288],
		flexDirection: "column",
		rowGap: px[16],
	},
	details: {
		display: "grid",
		alignItems: "baseline",
		gridTemplateColumns: "auto minmax(0,1fr)",
		columnGap: px[16],
		rowGap: px[12],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
	},
	tags: { gridColumn: "1 / -1" },
})

type ReleaseInfoPageProps = {
	release: Release
	correctionHistory: CorrectionHistoryItem[]
}

export function ReleaseInfoPage(props: ReleaseInfoPageProps) {
	const { t } = useLingui()
	const contextValue: ReleaseInfoPageContext = {
		get release() {
			return props.release
		},
	}

	return (
		<PageLayout styles={styles.page}>
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<ReleaseInfoPageContext.Provider value={contextValue}>
					<div {...stylex.attrs(styles.content)}>
						<div {...stylex.attrs(styles.header)}>
							<ReleaseInfoCoverImage />
							<div {...stylex.attrs(styles.summary)}>
								<ReleaseInfoTitleAndArtist />
								<div {...stylex.attrs(styles.details)}>
									<ReleaseInfoDetails />
									<EntityTags
										styles={styles.tags}
										entityType="release"
										entityId={props.release.id}
									/>
								</div>
								<div {...stylex.attrs(entityDetailStyles.collectionActions)}>
									<AddToUserCollectionButton
										entityType="Release"
										entityId={props.release.id}
									/>
									<Link
										to="/release/$id/image-upload"
										params={{ id: props.release.id.toString() }}
										class={
											stylex.attrs(
												link.base,
												buttonStyles.base,
												buttonStyles.outline,
												buttonStyles.gray,
												buttonStyles.sm,
											).class
										}
									>
										{t`Upload cover art`}
									</Link>
								</div>
							</div>
						</div>
						<div>
							<ReleaseInfoTabs release={props.release} />
							<EntityCorrectionMetadataSection
								entityType="release"
								entityId={props.release.id}
								correctionHistory={props.correctionHistory}
							/>
						</div>
					</div>
				</ReleaseInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}
