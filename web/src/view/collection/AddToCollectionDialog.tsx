import { useLingui } from "@lingui/solid/macro"
import { useInfiniteQuery, useMutation } from "@tanstack/solid-query"
import type {
	InfiniteData,
	UseInfiniteQueryResult,
} from "@tanstack/solid-query"
import { createSignal, createUniqueId, For, Show } from "solid-js"
import type { Accessor } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { PlusIcon } from "solid-radix-icons"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import type {
	UserCollection,
	UserCollectionItemEntityType,
	UserCollectionsError,
	UserCollectionsResponse,
} from "~/hey-api"
import { createUserCollectionItem } from "~/hey-api"
import {
	userCollectionDetailQueryKey,
	userCollectionItemsQueryKey,
	userCollectionsInfiniteOptions,
	userCollectionsQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT } from "~/state/tanstack"
import { useCurrentUser } from "~/state/user"
import { getNextPageParam } from "~/utils/query"

import { CollectionFormDialog } from "./CollectionFormDialog"
import { CollectionLoadMore } from "./CollectionLoadMore"

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	entityId: number
	entityType: UserCollectionItemEntityType
}

type FormState = {
	selectedCollectionId: number | undefined
	description: string
}

const FIELD_CLASS =
	"rounded-md border border-slate-300 px-2 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:bg-slate-100 disabled:text-slate-500"

type UserCollectionsQueryResult = UseInfiniteQueryResult<
	InfiniteData<UserCollectionsResponse>,
	UserCollectionsError
>

type CollectionFieldProps = {
	collectionsQuery: UserCollectionsQueryResult
	collections: Accessor<UserCollection[]>
	selectedCollectionId: number | undefined
	onSelectedCollectionIdChange: (
		selectedCollectionId: number | undefined,
	) => void
	onCreateCollection: () => void
}

function CollectionField(props: CollectionFieldProps) {
	const { t } = useLingui()
	const selectId = createUniqueId()
	const isInitialCollectionsLoading = () =>
		props.collectionsQuery.isFetching && !props.collectionsQuery.isSuccess
	const canSelectCollection = () =>
		props.collectionsQuery.isSuccess && props.collections().length > 0
	const selectPlaceholder = () => {
		if (isInitialCollectionsLoading()) return t`Loading collections...`
		if (props.collectionsQuery.isError) return t`Failed to load collections`
		if (props.collections().length === 0) return t`No collections available`
		return t`Select a collection`
	}

	return (
		<div class="flex flex-col gap-1">
			<div class="mb-1 flex items-center justify-between gap-3">
				<label
					for={selectId}
					class="text-sm font-medium text-slate-700"
				>
					{t`Collection`}
				</label>
				<Button
					type="button"
					variant="SecondaryV2"
					size="Sm"
					color="Slate"
					class="inline-flex items-center gap-1 px-2"
					onClick={props.onCreateCollection}
				>
					<PlusIcon class="size-4" />
					<div>{t`New collection`}</div>
				</Button>
			</div>
			<select
				id={selectId}
				value={props.selectedCollectionId?.toString() ?? ""}
				onChange={(e) => {
					const value = e.currentTarget.value
					props.onSelectedCollectionIdChange(
						value === "" ? undefined : Number(value),
					)
				}}
				class={`${FIELD_CLASS} w-full`}
				disabled={!canSelectCollection()}
				aria-busy={isInitialCollectionsLoading()}
				required
			>
				<option
					value=""
					disabled
				>
					{selectPlaceholder()}
				</option>
				<For each={props.collections()}>
					{(collection) => (
						<option value={collection.id}>{collection.name}</option>
					)}
				</For>
			</select>
			<Show
				when={
					props.collectionsQuery.isSuccess && props.collections().length === 0
				}
			>
				<p class="text-xs text-slate-500">{t`No collections yet.`}</p>
			</Show>
			<Show when={props.collectionsQuery.isError}>
				<p class="text-xs text-red-500">{t`Failed to load collections.`}</p>
			</Show>
			<CollectionLoadMore
				when={
					props.collectionsQuery.hasNextPage
					|| props.collectionsQuery.isFetchingNextPage
				}
				isLoading={props.collectionsQuery.isFetchingNextPage}
				variant="Secondary"
				onLoadMore={() => {
					void props.collectionsQuery.fetchNextPage()
				}}
			/>
		</div>
	)
}

type NoteFieldProps = {
	description: string
	onDescriptionInput: (description: string) => void
}

function NoteField(props: NoteFieldProps) {
	const { t } = useLingui()
	const noteId = createUniqueId()
	return (
		<div class="flex flex-col gap-1">
			<label
				for={noteId}
				class="mb-1 text-sm font-medium text-slate-700"
			>
				{t`Note (optional)`}
			</label>
			<textarea
				id={noteId}
				aria-label={t`Note (optional)`}
				value={props.description}
				onInput={(e) => props.onDescriptionInput(e.currentTarget.value)}
				class={`${FIELD_CLASS} h-24 resize-none`}
				maxLength={1000}
			></textarea>
		</div>
	)
}

function invalidateUserCollectionQueries(
	collectionId: number,
	username: string | undefined,
) {
	void QUERY_CLIENT.invalidateQueries({
		queryKey: userCollectionItemsQueryKey({
			path: { id: collectionId },
		}),
	})
	void QUERY_CLIENT.invalidateQueries({
		queryKey: userCollectionDetailQueryKey({
			path: { id: collectionId },
		}),
	})
	if (username === undefined) return

	void QUERY_CLIENT.invalidateQueries({
		queryKey: userCollectionsQueryKey({
			path: { username },
		}),
	})
}

export function AddToCollectionDialog(props: Props) {
	const { t } = useLingui()
	const userCtx = useCurrentUser()

	const [formStore, setFormStore] = createStore<FormState>({
		selectedCollectionId: undefined,
		description: "",
	})
	const [createCollectionOpen, setCreateCollectionOpen] = createSignal(false)

	const collectionsQuery = useInfiniteQuery(() => {
		const username = userCtx.user?.name

		return {
			...userCollectionsInfiniteOptions({
				path: { username: username ?? "" },
				query: { limit: 100 },
			}),
			initialPageParam: 1,
			getNextPageParam,
			enabled: username !== undefined && props.open,
		}
	})

	const collections = () => {
		if (!collectionsQuery.isSuccess) return []
		return collectionsQuery.data.pages.flatMap((page) => page.data.items)
	}
	const setSelectedCollectionId = (
		selectedCollectionId: number | undefined,
	) => {
		setFormStore(
			produce((draft) => {
				draft.selectedCollectionId = selectedCollectionId
			}),
		)
	}
	const setDescription = (description: string) => {
		setFormStore(
			produce((draft) => {
				draft.description = description
			}),
		)
	}

	const mutation = useMutation(() => ({
		mutationFn: async () => {
			const collectionId = formStore.selectedCollectionId
			if (collectionId === undefined) throw new Error("No collection selected")
			return createUserCollectionItem({
				path: { id: collectionId },
				body: {
					entity_id: props.entityId,
					entity_type: props.entityType,
					description:
						formStore.description === "" ? null : formStore.description,
				},
				throwOnError: true,
			})
		},
		onSuccess: () => {
			const collectionId = formStore.selectedCollectionId
			if (collectionId === undefined) return

			invalidateUserCollectionQueries(collectionId, userCtx.user?.name)
			props.onOpenChange(false)
			setFormStore(
				produce((draft) => {
					draft.selectedCollectionId = undefined
					draft.description = ""
				}),
			)
		},
	}))

	const handleSubmit = (e: Event) => {
		e.preventDefault()
		if (formStore.selectedCollectionId === undefined) return
		mutation.mutate()
	}

	return (
		<>
			<Dialog.Root
				open={props.open}
				onOpenChange={props.onOpenChange}
			>
				<Dialog.Portal>
					<Dialog.Overlay data-blur />
					<Dialog.Content class="flex w-full max-w-md flex-col rounded-md bg-white p-6 shadow-xl">
						<Dialog.Title class="mb-2 text-xl font-light tracking-tight text-primary">
							{t`Add to Collection`}
						</Dialog.Title>

						<form
							onSubmit={handleSubmit}
							class="flex flex-col gap-4"
						>
							<CollectionField
								collectionsQuery={collectionsQuery}
								collections={collections}
								selectedCollectionId={formStore.selectedCollectionId}
								onSelectedCollectionIdChange={setSelectedCollectionId}
								onCreateCollection={() => setCreateCollectionOpen(true)}
							/>

							<NoteField
								description={formStore.description}
								onDescriptionInput={setDescription}
							/>

							<Show when={mutation.error}>
								<div class="text-sm text-red-500">
									{mutation.error?.message
										?? t`An error occurred. Please try again.`}
								</div>
							</Show>

							<div class="grid w-full grid-cols-2 gap-3 self-end sm:w-56">
								<Button
									type="button"
									variant="Secondary"
									size="Md"
									class="px-2"
									onClick={() => props.onOpenChange(false)}
									disabled={mutation.isPending}
								>
									{t`Cancel`}
								</Button>
								<Button
									type="submit"
									variant="Primary"
									size="Md"
									class="px-2"
									disabled={
										mutation.isPending
										|| formStore.selectedCollectionId === undefined
									}
								>
									{t`Add`}
								</Button>
							</div>
						</form>
						<Dialog.CloseButton />
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
			<CollectionFormDialog
				open={createCollectionOpen()}
				onOpenChange={setCreateCollectionOpen}
			/>
		</>
	)
}
