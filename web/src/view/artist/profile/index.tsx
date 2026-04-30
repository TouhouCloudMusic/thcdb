/* @refresh skip */
import { useLingui } from "@lingui/solid/macro"
import type {
	Artist,
	ArtistCredit,
	CorrectionHistoryItem,
	Discography,
	ReleaseType,
} from "@thc/api"
import { createContext, Suspense } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { ButtonClass_new } from "~/component/atomic/button"
import { Image } from "~/component/image"
import { PageLayout } from "~/layout/PageLayout"
import type { InfiniteQuery } from "~/type/query"
import { imgUrl } from "~/utils/adapter/static_file"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"

import { ArtistInfo } from "./comp/ArtistInfo"
import { ArtistReleaseInfo } from "./comp/ArtistReleaseInfo"

const UPLOAD_LINK_CLASS = ButtonClass_new({
	variant: "SecondaryV2",
	size: "Sm",
})

export type ArtistContext = {
	artist: Artist
	appearances: InfiniteQuery<Discography>
	discographies: {
		data: Record<ReleaseType, Discography[]>
		hasNext(type: ReleaseType): boolean
		next(type: ReleaseType): Promise<void>
		isLoading: boolean
	}
	credits: InfiniteQuery<ArtistCredit>
}

export const ArtistContext = createContext<ArtistContext>()

export type ArtistProfilePageProps = {
	artist: Artist
	correctionHistory: CorrectionHistoryItem[]
	appearances: InfiniteQuery<Discography>
	discographies: {
		data: Record<ReleaseType, Discography[]>
		hasNext(type: ReleaseType): boolean
		next(type: ReleaseType): Promise<void>
		isLoading: boolean
	}
	credits: InfiniteQuery<ArtistCredit>
}

export function ArtistProfilePage(props: ArtistProfilePageProps) {
	const { t } = useLingui()
	const profileImageUrl = () => imgUrl(props.artist.profile_image_url)
	const contextValue: ArtistContext = {
		get artist() {
			return props.artist
		},
		get appearances() {
			return props.appearances
		},
		get discographies() {
			return props.discographies
		},
		get credits() {
			return props.credits
		},
	}
	return (
		<PageLayout class="p-9">
			{/* TODO: fallback */}
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<ArtistContext.Provider value={contextValue}>
					<div class="flex flex-col space-y-8">
						<div class="grid h-fit grid-cols-[auto_1fr] space-x-8">
							<div class="size-64 shrink-0 overflow-hidden rounded bg-slate-100">
								<Image.Root>
									<Image.Fallback>
										{(state) =>
											state == Image.State.Error ? (
												<div class="size-full bg-slate-100"></div>
											) : (
												<></>
											)
										}
									</Image.Fallback>
									<Image.Img
										src={profileImageUrl()}
										class="size-full"
									/>
								</Image.Root>
							</div>
							<div class="flex flex-col gap-4">
								<ArtistInfo />
								<div class="border-t border-slate-200 pt-4">
									<AddToUserCollectionButton
										entityType="Artist"
										entityId={props.artist.id}
									/>
								</div>
							</div>
						</div>
						<div>
							<ArtistReleaseInfo />
						</div>
						<EntityCorrectionMetadataSection
							entityType="artist"
							entityId={props.artist.id}
							correctionHistory={props.correctionHistory}
							trailingAction={
								<Link
									to="/artist/$id/image-upload"
									params={{ id: props.artist.id.toString() }}
									class={UPLOAD_LINK_CLASS}
									underline={false}
								>
									Upload image
								</Link>
							}
						/>
					</div>
					{/* <div class="max-w-full wrap-anywhere">
                {JSON.stringify(props.query.data)}
            </div> */}
				</ArtistContext.Provider>
			</Suspense>
		</PageLayout>
	)
}
