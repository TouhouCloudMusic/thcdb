import {
	cache,
	createAsync,
	Params,
	redirect,
	useParams,
} from "@solidjs/router"
import { For, onMount, Show, Suspense } from "solid-js"
import { findReleaseByID } from "~/database/release/find_release_by_id"

const getReleaseData = cache(async function (params: Params) {
	const ERR = Symbol("err")
	try {
		const id = parseInt(params?.["id"], 10)
		if (isNaN(id)) throw ERR
		const res = await findReleaseByID(id)
		if (!res) throw ERR
		return res
	} catch (e) {
		if (e === ERR) throw redirect("/404")
		else throw redirect("/500")
	}
}, `release_page`)

// export const route = {
// 	load: () => getReleaseData(),
// }

export default function ReleasePage() {
	const data = createAsync(() => getReleaseData(useParams()))
	onMount(() => {
		console.log(data())
	})

	return (
		<Suspense>
			<main>
				<div>Title: {data()?.title}</div>
				<div class="flex">
					<p>Artist: </p>
					<ul class="flex">
						{data()?.artist.map((a) => (
							<li>
								<a
									href={`/artist/${a.id}`}
									class="link">
									{a.artist.name}
								</a>
							</li>
						))}
					</ul>
				</div>
				<div>
					<Show when={data()?.credits}>
						<h4>Credit: </h4>
						<ul class="pl-4">
							{data()?.credits.map((credit) => (
								<li class="flex items-baseline">
									<a
										href={`/artist/${credit.artist.id}`}
										target="_self"
										class="link">
										{credit.artist.name}
									</a>
									{" - "}
									<ul>
										{credit.credit_role.map((r) => (
											<li>
												<a
													href={`/role/${r.id}`}
													class="link_gray text-[0.9rem] italic">
													{r.name}
												</a>
											</li>
										))}
									</ul>
								</li>
							))}
						</ul>
					</Show>
				</div>
				<div>
					<h4>Tracklist: </h4>
					<ul class="pl-4">
						<For each={data()?.tracklist}>
							{(track) => (
								<li
									class="grid"
									style={{
										"grid-template-columns": "auto 1fr",
									}}>
									<div class="grid grid-cols-2 text-center">
										<p class="">{track?.track_num ?? track.track_order}</p>
										<p> - </p>
									</div>
									<a
										href={`/song/${track.song.id}`}
										class="link"
										translate="no">
										{track.song.title}
									</a>
								</li>
							)}
						</For>
					</ul>
				</div>
			</main>
		</Suspense>
	)
}
