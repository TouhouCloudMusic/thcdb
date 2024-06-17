import { createAsync } from "@solidjs/router"
import {
	Show,
	Suspense,
	createEffect,
	createResource,
	on,
	onMount,
} from "solid-js"
import {
	findArtistWithAlias,
	findArtistMember,
	findArtistMemberOf,
	addData,
} from "~/database/artist/artist_model"
import { getReleaseByIDT } from "~/database/test_data/release"
import { resetAutoIncrement } from "~/database/util/reset_auto_increment"
import { logWithouProto } from "~/util/log_without_proto"

export default function () {
	const [data] = createResource(() => findArtistWithAlias())
	const releaseData = createAsync(() => getReleaseByIDT())
	const group = createAsync(() => findArtistMember())
	const findMemberTest = createAsync(() => findArtistMemberOf())
	createEffect(
		on(releaseData, () => {
			console.log(releaseData())
		})
	)
	return (
		<>
			<button
				class="button p-2"
				onClick={() => addData()}>
				Add
			</button>
			{/* <button
				class="button p-2"
				onClick={() => resetArtistTableAutoIncrement()}>
						Reset Auto Increment
			</button> */}
			<button
				class="button p-2"
				onClick={() => resetAutoIncrement("artist")}>
				Reset Auto Increment
			</button>
			<button
				class="button p-2"
				onClick={() => console.log(data())}>
				Log First Aritst
			</button>
			<button
				class="button p-2"
				onClick={() => console.log(group())}>
				Log Group Member
			</button>
			<button
				class="button p-2"
				onClick={() => console.log(findMemberTest())}>
				Log Member of Artist
			</button>
		</>
	)
}
