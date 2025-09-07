/* @refresh reload */
import * as M from "@modular-forms/solid"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { createMemo } from "solid-js"
import type { JSX } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Cross1Icon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { Intersperse } from "~/component/data/Intersperse"

import { useArtistForm } from "../../context"
import { ArtistSearchDialog } from "../ArtistSearchDialog"
import { FieldArrayFallback } from "../FieldArrayFallback"
import { MembershipRoleField } from "./role"
import { TenureFieldArray } from "./tenure"

function createMembershipStore() {
	let [membershipStore, setMembershipStore] = createStore([
		{
			id: 0,
			name: "Foo",
		},
		{
			id: 0,
			name: "Boo",
		},
	] as Artist[])

	return {
		get inner() {
			return membershipStore
		},
		push: (artist: Artist): void => {
			const exist = membershipStore.some(
				(membership) => membership.id === artist.id,
			)
			if (!exist) {
				setMembershipStore(
					produce((s) => {
						s.push(artist)
					}),
				)
			}
		},
		remove: (idx: number): void => {
			setMembershipStore(
				produce((s) => {
					s.splice(idx, 1)
				}),
			)
		},
	}
}

export function ArtistFormMembership(): JSX.Element {
	let context = useArtistForm()
	let { formStore } = context

	let membership = createMembershipStore()
	let type = createMemo(() => M.getValue(formStore, "data.artist_type"))

	let isDisabled = createMemo(() => {
		return !type() || type() === "Unknown"
	})

	let exclusion = createMemo(() => {
		let arr = membership.inner.map((x) => x.id)
		if (context.artistId) {
			arr.push(context.artistId)
		}
		return arr
	})

	let filter = createMemo<ArtistCommonFilter>(() => {
		let ty = type()
		return {
			artist_type: ty ? [ty] : undefined,
			exclusion: exclusion(),
		}
	})

	return (
		<div class="grid min-h-32 w-96 min-w-fit grid-cols-1">
			<div class="mb-2 flex items-center justify-between">
				<FormComp.Label class="m-0">Membership</FormComp.Label>
				<ArtistSearchDialog
					onSelect={membership.push}
					disabled={isDisabled()}
					filter={filter()}
				/>
			</div>
			<ul class="flex h-full flex-col">
				<Divider
					horizontal
					class="mb-2"
				/>
				<Intersperse
					of={membership.inner}
					with={
						<Divider
							horizontal
							class="my-2"
						/>
					}
					fallback={<FieldArrayFallback />}
				>
					{(artist, idx) => (
						<MembershipListItem
							index={idx()}
							onRemove={() => membership.remove(idx())}
							artist={artist}
						/>
					)}
				</Intersperse>
				<Divider
					horizontal
					class="mt-2"
				/>
			</ul>
		</div>
	)
}

type MembershipListItemProps = {
	index: number
	onRemove: () => void
	artist: Artist
}

function MembershipListItem(props: MembershipListItemProps) {
	const { formStore } = useArtistForm()
	return (
		<li class="flex flex-col gap-2">
			<M.Field
				of={formStore}
				name={`data.memberships.${props.index}.artist_id`}
				type="number"
			>
				{(field, fieldProps) => (
					<>
						<input
							{...fieldProps}
							type="number"
							hidden
							value={field.value}
						/>
						<div class="grid grid-cols-[1fr_auto] items-center">
							<div>{props.artist.name}</div>
							<Button
								variant="Tertiary"
								size="Sm"
								class="p-1.5"
								onClick={props.onRemove}
							>
								<Cross1Icon />
							</Button>
						</div>
					</>
				)}
			</M.Field>

			<MembershipRoleField index={props.index} />

			<TenureFieldArray index={props.index} />
		</li>
	)
}
