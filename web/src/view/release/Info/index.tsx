import { useLingui } from "@lingui/solid/macro"
import type { CorrectionHistoryItem, Release } from "@thc/api"
import { Suspense } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { ButtonClass_new } from "~/component/atomic/button"
import { PageLayout } from "~/layout/PageLayout"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { EntityTagsSectionContainer } from "~/view/entity_tags/EntityTagsSection"

import { ReleaseInfoTabs } from "./ReleaseInfoTabs"
import { ReleaseInfoCoverImage } from "./comp/ReleaseInfoCoverImage"
import { ReleaseInfoDetails } from "./comp/ReleaseInfoDetails"
import { ReleaseInfoTitleAndArtist } from "./comp/ReleaseInfoTitleAndArtist"
import { ReleaseInfoPageContext } from "./context"

type ReleaseInfoPageProps = {
	release: Release
	correctionHistory: CorrectionHistoryItem[]
}

const UPLOAD_LINK_CLASS = ButtonClass_new({
	variant: "SecondaryV2",
	size: "Sm",
})

export function ReleaseInfoPage(props: ReleaseInfoPageProps) {
	const { t } = useLingui()
	const contextValue: ReleaseInfoPageContext = {
		get release() {
			return props.release
		},
	}

	return (
		<PageLayout class="p-8">
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<ReleaseInfoPageContext.Provider value={contextValue}>
					<div class="grid grid-cols-[auto_1fr] gap-8">
						<ReleaseInfoCoverImage />
						<div class="flex flex-col gap-y-4">
							<ReleaseInfoTitleAndArtist />
							<div class="grid items-baseline grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
								<ReleaseInfoDetails />
								<EntityTagsSectionContainer
									class="contents"
									entityType="release"
									entityId={props.release.id}
								/>
							</div>
							<div class="border-t border-slate-200 pt-4">
								<AddToUserCollectionButton
									entityType="Release"
									entityId={props.release.id}
								/>
							</div>
						</div>
						<div class="col-span-full">
							<ReleaseInfoTabs release={props.release} />
							<EntityCorrectionMetadataSection
								entityType="release"
								entityId={props.release.id}
								correctionHistory={props.correctionHistory}
								trailingAction={
									<Link
										to="/release/$id/image-upload"
										params={{ id: props.release.id.toString() }}
										class={UPLOAD_LINK_CLASS}
										underline={false}
									>
										{t`Upload cover art`}
									</Link>
								}
							/>
						</div>
					</div>
				</ReleaseInfoPageContext.Provider>
			</Suspense>
		</PageLayout>
	)
}
