/* @refresh skip */
import { createContext, Suspense } from "solid-js"

import type { Artist, Discography, Appearance, Credit } from "~/api/artist"
import type { ReleaseType } from "~/api/release"
import { Image } from "~/components/image"
import { PageLayout } from "~/layout/PageLayout"
import type { InfiniteQuery } from "~/types/query"

import { ArtistInfo } from "./comp/ArtistInfo"
import { ArtistReleaseInfo } from "./comp/ArtistReleaseInfo"

export type ArtistContext = {
	artist: Artist
	appearances: InfiniteQuery<Appearance>
	discographies: {
		data: Record<ReleaseType, Discography[]>
		hasNext(type: ReleaseType): boolean
		next(type: ReleaseType): Promise<void>
		isLoading: boolean
	}
	credits: InfiniteQuery<Credit>
}

export const ArtistContext = createContext<ArtistContext>()

export type ArtistProfilePageProps = {
	artist: Artist
	appearances: InfiniteQuery<Appearance>
	discographies: {
		data: Record<ReleaseType, Discography[]>
		hasNext(type: ReleaseType): boolean
		next(type: ReleaseType): Promise<void>
		isLoading: boolean
	}
	credits: InfiniteQuery<Credit>
}

export function ArtistProfilePage(props: ArtistProfilePageProps) {
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
			<Suspense fallback={<div>Loading...</div>}>
				<ArtistContext.Provider value={contextValue}>
					<div class="flex flex-col space-y-8">
						<div class="grid h-fit grid-cols-[auto_1fr] space-x-8">
							<Image.Root>
								<Image.Fallback>
									{(state) =>
										state == Image.State.Error ?
											<div class="size-64 bg-slate-100"></div>
										:	<></>
									}
								</Image.Fallback>
								<Image.Img src={props.artist.profile_image_url ?? undefined} />
							</Image.Root>
							<ArtistInfo />
						</div>
						<div>
							<ArtistReleaseInfo />
						</div>
					</div>
					{/* <div class="max-w-full wrap-anywhere">
                {JSON.stringify(props.query.data)}
            </div> */}
				</ArtistContext.Provider>
			</Suspense>
		</PageLayout>
	)
}
