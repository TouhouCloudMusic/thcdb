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
import { px, radius } from "~/style/tokens.stylex"
import type { InfiniteQuery } from "~/type/query"
import { imgUrl } from "~/utils/adapter/static_file"
import { AddToUserCollectionButton } from "~/view/collection/AddToUserCollectionButton"
import { EntityCorrectionMetadataSection } from "~/view/correction/EntityCorrectionMetadataSection"
import { EntityTags } from "~/view/entity_tags/EntityTags"

import { ArtistInfo } from "./comp/ArtistInfo"
import { ArtistReleaseInfo } from "./comp/ArtistReleaseInfo"

const styles = stylex.create({
	page: {
		display: "grid",
		width: `round(down, 100%, ${px[32]})`,
		borderInlineWidth: 0,
		gridTemplateColumns: `repeat(auto-fill,${px[32]})`,
		gridTemplateRows: `${px[32]} auto ${px[32]}`,
		alignContent: "start",
	},
	content: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridColumn: "2 / -2",
		gridRow: "2",
		alignContent: "start",
	},
	overview: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		gridTemplateRows: {
			default: `auto ${px[32]} auto`,
			"@container (min-width: 40rem)": "auto",
		},
		gridColumn: "1 / -1",
		alignItems: "start",
	},
	portrait: {
		gridColumn: {
			default: "1 / -1",
			"@container (min-width: 40rem)": "span 8 / span 8",
		},
		gridRow: "1",
		aspectRatio: "1 / 1",
		width: `min(100%,${px[256]})`,
		overflow: "hidden",
		borderRadius: radius.sm,
		backgroundColor: palette.slate[100],
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
		display: "grid",
		gridTemplateColumns: "subgrid",
		rowGap: px[16],
		gridColumn: {
			default: "1 / -1",
			"@container (min-width: 40rem)": "10 / -1",
		},
		gridRow: {
			default: "3",
			"@container (min-width: 40rem)": "1",
		},
		minWidth: 0,
	},
	actions: {
		gridColumn: "1 / -1",
		display: "flex",
		flexWrap: "wrap",
		gap: px[8],
	},
	action: {
		height: px[32],
		paddingBlock: 0,
	},
	tags: {
		gridColumn: "1 / -1",
		width: "fit-content",
		minWidth: `min(${px[384]}, 100%)`,
		maxWidth: "100%",
		justifySelf: "start",
		overflowWrap: "anywhere",
	},
	section: {
		gridColumn: "1 / -1",
		paddingBlockStart: px[32],
		minWidth: 0,
	},
	releaseSection: {
		display: "grid",
		gridTemplateColumns: "subgrid",
		paddingBlockStart: px[16],
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
								<EntityTags
									styles={styles.tags}
									entityType="artist"
									entityId={props.artist.id}
								/>
								<div {...stylex.attrs(styles.actions)}>
									<AddToUserCollectionButton
										entityType="Artist"
										entityId={props.artist.id}
										styles={styles.action}
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
												styles.action,
											).class
										}
									>
										{t`Upload image`}
									</Link>
								</div>
							</div>
						</div>
						<div {...stylex.attrs(styles.section, styles.releaseSection)}>
							<ArtistReleaseInfo />
						</div>
						<div {...stylex.attrs(styles.section)}>
							<EntityCorrectionMetadataSection
								entityType="artist"
								entityId={props.artist.id}
								correctionHistory={props.correctionHistory}
							/>
						</div>
					</div>
				</ArtistContext.Provider>
			</Suspense>
		</PageLayout>
	)
}
