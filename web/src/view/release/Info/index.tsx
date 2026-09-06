import { useLingui } from "@lingui/solid/macro"
import type { CorrectionHistoryItem, Release } from "@thc/api"
import { Suspense } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { ButtonClass_new } from "~/component/atomic/button"
import { PageLayout } from "~/layout/PageLayout"
import {
	ADD_TO_COLLECTION_ACTIONS_CLASS,
	AddToUserCollectionButton,
} from "~/view/collection/AddToUserCollectionButton"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { EntityTags } from "~/view/entity_tags/EntityTags"

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
		<PageLayout class="p-[clamp(1rem,4vw,2rem)]">
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<ReleaseInfoPageContext.Provider value={contextValue}>
					<div class="flex flex-col gap-8">
						<div class="flex flex-wrap items-start justify-center gap-6">
							<ReleaseInfoCoverImage />
							<div class="flex min-w-0 flex-1 basis-72 flex-col gap-y-4">
								<ReleaseInfoTitleAndArtist />
								<div class="grid items-baseline grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
									<ReleaseInfoDetails />
									<EntityTags
										class="col-span-full"
										entityType="release"
										entityId={props.release.id}
									/>
								</div>
								<div class={ADD_TO_COLLECTION_ACTIONS_CLASS}>
									<AddToUserCollectionButton
										entityType="Release"
										entityId={props.release.id}
									/>
									<Link
										to="/release/$id/image-upload"
										params={{ id: props.release.id.toString() }}
										class={UPLOAD_LINK_CLASS}
										underline={false}
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
