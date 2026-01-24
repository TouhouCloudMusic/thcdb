/* @refresh reload */
import { Field, getInput, insert, remove } from "@formisch/solid"
import type { Artist, ArtistCommonFilter } from "@thc/api"
import { createMemo } from "solid-js"
import type { JSX } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Cross1Icon, PlusIcon } from "solid-radix-icons"

import { Divider } from "~/component/atomic/Divider"
import { Button } from "~/component/atomic/button"
import { FormComp } from "~/component/atomic/form"
import { Intersperse } from "~/component/data/Intersperse"
import { FieldArrayFallback } from "~/component/form"
import { ArtistSearchDialog } from "~/component/form/SearchDialog"

import { useArtistForm } from "../../context"
import { MembershipRoleField } from "./role"
import { TenureFieldArray } from "./tenure"

function createMembershipStore() {
	const [membershipStore, setMembershipStore] = createStore([] as Artist[])

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
	const context = useArtistForm()
	const { formStore } = context

	const membership = createMembershipStore()
	const type = createMemo(() =>
		getInput(formStore, { path: ["data", "artist_type"] }),
	)

	const isDisabled = createMemo(() => {
		return !type() || type() === "Unknown"
	})

	const exclusion = createMemo(() => {
		const arr = membership.inner.map((x) => x.id)
		if (context.artistId) {
			arr.push(context.artistId)
		}
		return arr
	})

	const filter = createMemo<ArtistCommonFilter>(() => {
		const ty = type()
		return {
			artist_type: ty ? [ty] : undefined,
			exclusion: exclusion(),
		}
	})

	const addMembership = (artist: Artist) => {
		membership.push(artist)
		insert(formStore, {
			path: ["data", "memberships"],
			initialInput: { artist_id: artist.id, roles: [], tenure: [] },
		})
	}

	const removeMembershipAt = (index: number) => () => {
		membership.remove(index)
		remove(formStore, { path: ["data", "memberships"], at: index })
	}

	return (
		<div class="grid min-h-32 w-96 min-w-fit grid-cols-1">
			<div class="mb-2 flex items-center justify-between">
				<FormComp.Label class="m-0">Membership</FormComp.Label>
				<ArtistSearchDialog
					onSelect={addMembership}
					disabled={isDisabled()}
					queryFilter={filter()}
					dataFilter={(artist) =>
						!membership.inner.some((m) => m.id === artist.id)
					}
					icon={<PlusIcon class="size-4 text-slate-600" />}
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
							onRemove={removeMembershipAt(idx())}
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
			<Field
				of={formStore}
				path={["data", "memberships", props.index, "artist_id"]}
			>
				{(field) => (
					<>
						<input
							{...field.props}
							type="number"
							hidden
							value={field.input ?? props.artist.id}
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
			</Field>

			<MembershipRoleField index={props.index} />

			<TenureFieldArray index={props.index} />
		</li>
	)
}
