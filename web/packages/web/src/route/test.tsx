// import { createAsync } from "@solidjs/router"
// import {
// 	Show,
// 	Suspense,
// 	createEffect,
// 	createResource,
// 	on,
// 	onMount,
// } from "solid-js"
// import {
// 	findArtistWithAlias,
// 	findArtistMember,
// 	findArtistMemberOf,
// 	addData,
// } from "~/database/artist/artist_model"
// import { resetAutoIncrement } from "~/database/util/reset_auto_increment"

import { findArtistByKeyword_EditArtistPage } from "./(artist)/add/artist/db"

export default function foo() {
	const logger = async () => {
		console.log("foo bar")
		console.log(await findArtistByKeyword_EditArtistPage("foo", "Person"))
	}
	return (
		<>
			<div>foo</div>
			<button onClick={logger}>button</button>
		</>
	)
}

// export default function () {
// 	const [data] = createResource(() => findArtistWithAlias())
// 	const group = createAsync(() => findArtistMember())
// 	const findMemberTest = createAsync(() => findArtistMemberOf())

// 	return (
// 		<>
// 			<button
// 				class="button p-2"
// 				onClick={() => addData()}>
// 				Add
// 			</button>
// 			{/* <button
// 				class="button p-2"
// 				onClick={() => resetArtistTableAutoIncrement()}>
// 						Reset Auto Increment
// 			</button> */}
// 			<button
// 				class="button p-2"
// 				onClick={() => resetAutoIncrement("artist")}>
// 				Reset Auto Increment
// 			</button>
// 			<button
// 				class="button p-2"
// 				onClick={() => console.log(data())}>
// 				Log First Aritst
// 			</button>
// 			<button
// 				class="button p-2"
// 				onClick={() => console.log(group())}>
// 				Log Group Member
// 			</button>
// 			<button
// 				class="button p-2"
// 				onClick={() => console.log(findMemberTest())}>
// 				Log Member of Artist
// 			</button>
// 		</>
// 	)
// }
