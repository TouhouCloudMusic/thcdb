import { Index } from "solid-js"
import { useSongState } from "../song.state"

const roleListClass = "flex flex-wrap my-0.5 text-sm"
export function CreditComp() {
	const { credits } = useSongState()
	return (
		<>
			<h3>Credits</h3>
			<ul class="my-1 flex flex-col py-1 pl-1">
				<Index each={credits()}>
					{(artist, index) => (
						<li>
							<a href="">{artist().name}</a>
							<ul class={roleListClass}>
								<Index each={artist().role}>
									{(role, index) => (
										<li>
											<a
												href=""
												class="text-gray-600">
												{role()}
											</a>
											{index !== role.length - 1
												? ", "
												: ""}
										</li>
									)}
								</Index>
							</ul>
						</li>
					)}
				</Index>
			</ul>
		</>
	)
}
