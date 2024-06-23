// import { Tabs } from "@ark-ui/solid"
// import { Title } from "@solidjs/meta"
// import {
// 	Params,
// 	cache,
// 	createAsync,
// 	redirect,
// 	useParams,
// } from "@solidjs/router"
// import dayjs from "dayjs"
// import { either } from "fp-ts"
// import { pipe } from "fp-ts/lib/function"
// import {
// 	Accessor,
// 	Show,
// 	Suspense,
// 	createContext,
// 	onMount,
// 	useContext,
// } from "solid-js"
// import {
// 	ArtistDataByID,
// 	findArtistByID,
// } from "~/database/artist/find_artist_by_id"
// import { NotFoundError } from "~/lib/error/errors"
// import { isValidID } from "~/lib/validate/validate_params"

// const getArtistDataByID = cache(async function (params: Params) {
// 	return await pipe(
// 		params,
// 		isValidID,
// 		either.match(
// 			() => {
// 				throw redirect("/404")
// 			},
// 			async (id) =>
// 				pipe(
// 					await findArtistByID(id),
// 					either.match(
// 						(e) => {
// 							if (e instanceof NotFoundError) throw redirect("/404")
// 							// TODO: 研究如何把error发到客户端上
// 							else {
// 								console.log(e)
// 								throw redirect("/500")
// 							}
// 						},
// 						(d) => d
// 					)
// 				)
// 		)
// 	)
// }, `artist_by_id`)

// type Controller = Accessor<ArtistDataByID>

// const Context = createContext<Controller>()
// const useData = () => useContext(Context)!

// export default function ArtistPage() {
// 	const data = createAsync(() => getArtistDataByID(useParams()))

// 	return (
// 		<Suspense fallback={<div>Loading……</div>}>
// 			<Context.Provider value={data as Accessor<ArtistDataByID>}>
// 				<Title>{data()?.name} - Touhou Cloud DB</Title>
// 				<Main />
// 			</Context.Provider>
// 		</Suspense>
// 	)
// }

// function Main() {
// 	const data = useData()
// 	return (
// 		<main class="flex flex-col gap-2">
// 			<h2>{data()?.name}</h2>
// 			<div class="flex">
// 				<Show
// 					when={data()?.member_of.length !== 0 || data()?.members.length !== 0}>
// 					<p class="text-gray-700">
// 						{data()?.type === "Person" ? "member of " : "members "}
// 					</p>
// 					<ul>
// 						{data()?.type === "Person" ?
// 							data()?.member_of.map((m) => (
// 								<ArtistMemberItem
// 									id={m.id}
// 									name={m.name}
// 								/>
// 							))
// 						:	data()?.members.map((m) => (
// 								<ArtistMemberItem
// 									id={m.id}
// 									name={m.name}
// 								/>
// 							))
// 						}
// 					</ul>
// 				</Show>
// 			</div>
// 			<div class="flex">
// 				<Tab />
// 			</div>
// 			<div class="flex"></div>
// 			{/* <Show when={data()?.release_credit.length}>
// 				<div class="flex flex-col">
// 					<p>Credits </p>
// 					<ul class="pl-4">
// 						{data()?.release_credit.map((r) => (
// 							<li class="flex">
// 								<a
// 									href={`/release/${r.release.id}`}
// 									class="link">
// 									{r.release.title}
// 								</a>
// 								{r.release ?
// 									<ul class="flex items-baseline text-gray-700">
// 										{" - "}
// 										{r.credit_role.map((c) => (
// 											<li class="italic link_gray text-sm ">{c.name}</li>
// 										))}
// 									</ul>
// 								:	""}
// 							</li>
// 						))}
// 					</ul>
// 				</div>
// 			</Show> */}
// 		</main>
// 	)
// }

// function ArtistMemberItem(props: { name: string; id: number | bigint }) {
// 	return (
// 		<li>
// 			<a
// 				href={`/artist/${props.id}`}
// 				class="link">
// 				{props.name}
// 			</a>
// 		</li>
// 	)
// }

// function Tab() {
// 	const data = useData()
// 	onMount(() => {
// 		console.log(data()?.release.length)
// 	})
// 	const triggerTwClass =
// 		"text-lg w-20 place-content-center hover:bg-gray-100 py-2 text-gray-900"
// 	return (
// 		<Tabs.Root
// 			defaultValue={data()?.release.length > 0 ? "release" : "credits"}
// 			class="w-fit"
// 			lazyMount>
// 			<Tabs.List class="relative">
// 				{/* <Show when={data()?.release.length > 0}>

// 				</Show> */}
// 				<Tabs.Trigger
// 					value="release"
// 					class={triggerTwClass}>
// 					Release
// 				</Tabs.Trigger>
// 				<Tabs.Trigger
// 					value="credits"
// 					class={triggerTwClass}>
// 					Credits
// 				</Tabs.Trigger>
// 				{/* <Show when={data()?.release_credit.length > 0}>

// 				</Show> */}
// 				<Tabs.Indicator
// 					class="h-[2px] w-20 bg-blue-800"
// 					// style={{
// 					// 	"transition-property": "all",
// 					// 	"transition-timing-function": "cubic-bezier(0.4, 0, 0.2, 1)",
// 					// 	"transition-duration": "0ms",
// 					// }}
// 				/>
// 			</Tabs.List>
// 			<Show when={data()?.release.length > 0}>
// 				<Tabs.Content
// 					value="release"
// 					class="mt-2 pl-2">
// 					<ReleaseTab />
// 				</Tabs.Content>
// 			</Show>
// 			<Show when={data()?.release_credit.length > 0}>
// 				<Tabs.Content
// 					value="credits"
// 					class="mt-2 pl-2">
// 					<CreditsTab />
// 				</Tabs.Content>
// 			</Show>
// 		</Tabs.Root>
// 	)
// }

// function ReleaseTab() {
// 	const data = useData()
// 	return (
// 		<ul>
// 			{data().release.map((r) => (
// 				<li class="flex h-12 gap-2 rounded p-1">
// 					<img
// 						src={`/img/cover/release/${r.release.id}.png`}
// 						alt={`cover art of ${r.release.title}`}
// 						class="rounded"
// 					/>
// 					<div class="flex flex-col place-content-center">
// 						<a
// 							href={`/release/${r.release.id}`}
// 							class="link">
// 							{r.release.title}
// 						</a>
// 						<p class="text-sm text-gray-700">
// 							{r.release.release_date_year ?
// 								r.release.release_date_year
// 							:	"n/a"}
// 						</p>
// 					</div>
// 				</li>
// 			))}
// 		</ul>
// 	)
// }

// function CreditsTab() {
// 	const data = useData()
// 	return (
// 		<ul>
// 			{data()?.release_credit?.map((r) => (
// 				<li class="flex h-12 gap-2 rounded p-1">
// 					<img
// 						src={`/img/cover/release/${r.release.id}.png`}
// 						alt={`cover art of ${r.release.title}`}
// 						class="rounded"
// 					/>
// 					<div class="flex flex-col place-content-center">
// 						<a
// 							href={`/release/${r.release.id}`}
// 							class="link">
// 							{r.release.title}
// 						</a>
// 						<p class="text-sm text-gray-700">
// 							{r.credit_role.map((c) => (
// 								<span class="italic">{c.name.toLowerCase()}</span>
// 							))}{" "}
// 							-{" "}
// 							{r.release.release_date_year ?
// 								r.release.release_date_year
// 							:	"n/a"}
// 						</p>
// 					</div>
// 				</li>
// 			))}
// 		</ul>
// 	)
// }
