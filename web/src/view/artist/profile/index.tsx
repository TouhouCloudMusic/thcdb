/* @refresh skip */
import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { Link } from "@tanstack/solid-router"
import type {
	Artist,
	ArtistCredit,
	CorrectionHistoryItem,
	Discography,
	ReleaseType,
} from "@thc/api"
import { createContext, Suspense } from "solid-js"

import { buttonStyles } from "~/component/atomic/button"
import { Image } from "~/component/image"
import { PageLayout } from "~/layout/PageLayout"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { radius, px } from "~/style/tokens.stylex"
import type { InfiniteQuery } from "~/type/query"
import { imgUrl } from "~/utils/adapter/static_file"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { entityDetailStyles } from "~/view/entity/detailStyles"

import { ArtistInfo } from "./comp/ArtistInfo"
import { ArtistReleaseInfo } from "./comp/ArtistReleaseInfo"

const styles = stylex.create({
	page: {
		padding: "clamp(1rem,4vw,2rem)",
	},
	content: {
		display: "flex",
		flexDirection: "column",
		gap: px[32],
	},
	overview: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "flex-start",
		justifyContent: "center",
		gap: px[24],
	},
	portrait: {
		aspectRatio: "1 / 1",
		width: "100%",
		overflow: "hidden",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
		maxWidth: {
			default: null,
			"@media (min-width: 40rem)": px[256],
		},
	},
	imagePlaceholder: {
		width: "100%",
		height: "100%",
		backgroundColor: palette.slate[100],
	},
	image: {
		width: "100%",
		height: "100%",
	},
	details: {
		display: "flex",
		minWidth: 0,
		flex: "1",
		flexBasis: px[288],
		flexDirection: "column",
		gap: px[16],
	},
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
		<PageLayout styles={[styles.page]}>
			{/* TODO: fallback */}
			<Suspense fallback={<div>{t`Loading...`}</div>}>
				<ArtistContext.Provider value={contextValue}>
					<div {...stylex.attrs(styles.content)}>
						<div {...stylex.attrs(styles.overview)}>
							<div {...stylex.attrs(styles.portrait)}>
								<Image.Root>
									<Image.Fallback>
										{(state) =>
											state == Image.State.Error ? (
												<div {...stylex.attrs(styles.imagePlaceholder)}></div>
											) : (
												<></>
											)
										}
									</Image.Fallback>
									<Image.Img
										src={profileImageUrl()}
										styles={[styles.image]}
									/>
								</Image.Root>
							</div>
							<div {...stylex.attrs(styles.details)}>
								<ArtistInfo />
								<div {...stylex.attrs(entityDetailStyles.collectionActions)}>
									<AddToUserCollectionButton
										entityType="Artist"
										entityId={props.artist.id}
									/>
									<Link
										to="/artist/$id/image-upload"
										params={{ id: props.artist.id.toString() }}
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
										{t`Upload image`}
									</Link>
								</div>
							</div>
						</div>
						<ArtistReleaseInfo />
						<EntityCorrectionMetadataSection
							entityType="artist"
							entityId={props.artist.id}
							correctionHistory={props.correctionHistory}
						/>
					</div>
				</ArtistContext.Provider>
			</Suspense>
		</PageLayout>
	)
}
