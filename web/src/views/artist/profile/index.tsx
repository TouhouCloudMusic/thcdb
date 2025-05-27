/* @refresh skip */
import { createContext, Suspense } from "solid-js"

import type { Artist, ArtistRelease as TArtistRelease } from "~/api/artist"
import type { ReleaseType } from "~/api/release"
import { Image } from "~/components/image"
import { PageLayout } from "~/layout/PageLayout"
import type { InfiniteQuery } from "~/types/query"

import { ArtistRelease } from "./comp/ArtistRelease"
import { Info } from "./comp/Info"

export type ArtistContext = {
	artist: Artist
	appearances: InfiniteQuery<TArtistRelease>
	discographies: {
		data: TArtistRelease[]
		hasNext(type: ReleaseType): boolean
		next(type: ReleaseType): Promise<void>
	}
	credits: InfiniteQuery<TArtistRelease>
}

export const ArtistContext = createContext<ArtistContext>()

export type ArtistProfilePageProps = {
	artist: Artist
	appearances: InfiniteQuery<TArtistRelease>
	discographies: {
		data: TArtistRelease[]
		hasNext(type: ReleaseType): boolean
		next(type: ReleaseType): Promise<void>
	}
	credits: InfiniteQuery<TArtistRelease>
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
		<PageLayout class="px-9 py-8">
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
							<Info />
						</div>
						<div>
							<Suspense fallback={<div>Loading...</div>}>
								<ArtistRelease />
							</Suspense>
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
