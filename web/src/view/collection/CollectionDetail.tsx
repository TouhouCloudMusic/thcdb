import { useLingui } from "@lingui/solid/macro"
import { createSignal, For, Match, Show, Switch } from "solid-js"

import { Link } from "~/component/atomic/Link"
import { Button } from "~/component/atomic/button"
import { AlertDialog } from "~/component/dialog/AlertDialog"
import type { UserCollection } from "~/hey-api"

import { CollectionFormDialog } from "./CollectionFormDialog"
import { CollectionItemCard } from "./CollectionItemCard"
import type { UserCollectionItemDetail } from "./CollectionItemCard"
import { CollectionLoadMore } from "./CollectionLoadMore"

type LoadingItemsFetchState = { status: "loading" }

type ErrorItemsFetchState = { status: "error" }

type SuccessItemsFetchState = {
	status: "success"
	items: UserCollectionItemDetail[]
	isFetchingMore: boolean
	hasMore: boolean
}

type ItemsFetchState =
	| LoadingItemsFetchState
	| ErrorItemsFetchState
	| SuccessItemsFetchState

type OwnerViewer = {
	role: "owner"
	isDeletingCollection: boolean
	isDeletingItem: boolean
	isReorderingItems: boolean
}

type VisitorViewer = {
	role: "visitor"
	isFollowing: boolean
	isTogglingFollow: boolean
	followErrorMessage?: string
}

type ReadonlyViewer = { role: "readonly" }

type CollectionDetailViewer = OwnerViewer | VisitorViewer | ReadonlyViewer

export type CollectionDetailModel = {
	collection: UserCollection
	items: ItemsFetchState
	viewer: CollectionDetailViewer
}

export type CollectionDetailController = {
	retryItems: () => void
	loadMoreItems: () => void
	deleteCollection: () => void
	deleteItem: (itemId: number) => void
	reorderItems: (itemIds: number[]) => void
	toggleFollow: () => void
}

type OwnerCollectionActionsProps = {
	owner: OwnerViewer
	controller: CollectionDetailController
	isEditingItems: boolean
	onEditCollection: () => void
	onToggleEditingItems: () => void
}

function OwnerCollectionActions(props: OwnerCollectionActionsProps) {
	const { t } = useLingui()

	return (
		<div class="flex items-center gap-2">
			<Button
				variant="SecondaryV2"
				size="Sm"
				onClick={props.onEditCollection}
			>
				{t`Edit Collection`}
			</Button>
			<Button
				variant="SecondaryV2"
				size="Sm"
				disabled={props.owner.isDeletingItem || props.owner.isReorderingItems}
				onClick={props.onToggleEditingItems}
			>
				{props.isEditingItems ? t`Done` : t`Edit items`}
			</Button>
			<AlertDialog
				title={t`Delete Collection`}
				description={t`Are you sure you want to delete this collection? This action cannot be undone.`}
				confirmText={t`Delete`}
				onCancel={() => undefined}
				onConfirm={props.controller.deleteCollection}
				triggerAs={(triggerProps) => (
					<Button
						{...triggerProps}
						variant="SecondaryV2"
						size="Sm"
						disabled={props.owner.isDeletingCollection}
					>
						{t`Delete`}
					</Button>
				)}
			/>
		</div>
	)
}

type VisitorCollectionActionsProps = {
	visitor: VisitorViewer
	controller: CollectionDetailController
}

function VisitorCollectionActions(props: VisitorCollectionActionsProps) {
	const { t } = useLingui()
	const followButtonText = (visitor: VisitorViewer) => {
		if (visitor.isTogglingFollow) return t`Loading...`
		return visitor.isFollowing ? t`Unfollow` : t`Follow`
	}

	return (
		<div class="flex items-center gap-2">
			<Button
				variant="SecondaryV2"
				size="Sm"
				disabled={props.visitor.isTogglingFollow}
				onClick={props.controller.toggleFollow}
			>
				{followButtonText(props.visitor)}
			</Button>
		</div>
	)
}

type CollectionHeaderActionsProps = {
	viewer: CollectionDetailViewer
	controller: CollectionDetailController
	isEditingItems: boolean
	onEditCollection: () => void
	onToggleEditingItems: () => void
}

function CollectionHeaderActions(props: CollectionHeaderActionsProps) {
	return (
		<Switch>
			<Match when={props.viewer.role === "owner" ? props.viewer : undefined}>
				{(owner) => (
					<OwnerCollectionActions
						owner={owner()}
						controller={props.controller}
						isEditingItems={props.isEditingItems}
						onEditCollection={props.onEditCollection}
						onToggleEditingItems={props.onToggleEditingItems}
					/>
				)}
			</Match>
			<Match when={props.viewer.role === "visitor" ? props.viewer : undefined}>
				{(visitor) => (
					<VisitorCollectionActions
						visitor={visitor()}
						controller={props.controller}
					/>
				)}
			</Match>
		</Switch>
	)
}

function CollectionMetadata(props: { collection: UserCollection }) {
	const { t } = useLingui()

	return (
		<div class="flex items-center text-sm text-tertiary">
			<span>
				{t`Created by`}{" "}
				<Link
					to="/profile/$username"
					params={{ username: props.collection.owner.name }}
					class="font-medium text-primary hover:underline"
				>
					{props.collection.owner.name}
				</Link>
			</span>
			<span class="mx-2 text-slate-300">•</span>
			<span>{props.collection.is_public ? t`Public` : t`Private`}</span>
			<span class="mx-2 text-slate-300">•</span>
			<span>
				{props.collection.item_count}{" "}
				{props.collection.item_count === 1 ? t`item` : t`items`}
			</span>
		</div>
	)
}

function VisitorFollowError(props: { viewer: CollectionDetailViewer }) {
	return (
		<Switch>
			<Match
				when={
					props.viewer.role === "visitor"
						? props.viewer.followErrorMessage
						: undefined
				}
			>
				{(message) => <div class="text-sm text-red-600">{message()}</div>}
			</Match>
		</Switch>
	)
}

type CollectionDetailHeaderProps = {
	model: CollectionDetailModel
	controller: CollectionDetailController
	isEditingItems: boolean
	onEditCollection: () => void
	onToggleEditingItems: () => void
}

function CollectionDetailHeader(props: CollectionDetailHeaderProps) {
	return (
		<header class="flex flex-col gap-4 border-b border-slate-300 pb-6">
			<div class="flex items-start justify-between gap-4">
				<h1 class="text-3xl font-light tracking-tight text-primary">
					{props.model.collection.name}
				</h1>
				<CollectionHeaderActions
					viewer={props.model.viewer}
					controller={props.controller}
					isEditingItems={props.isEditingItems}
					onEditCollection={props.onEditCollection}
					onToggleEditingItems={props.onToggleEditingItems}
				/>
			</div>

			<CollectionMetadata collection={props.model.collection} />

			<Show when={props.model.collection.description}>
				<p class="mt-2 whitespace-pre-wrap text-secondary">
					{props.model.collection.description}
				</p>
			</Show>
			<VisitorFollowError viewer={props.model.viewer} />
		</header>
	)
}

type OwnerItemsListProps = {
	state: SuccessItemsFetchState
	owner: OwnerViewer
	controller: CollectionDetailController
	isEditingItems: boolean
}

function OwnerItemsList(props: OwnerItemsListProps) {
	const canReorderItems = () => {
		return (
			!props.state.hasMore
			&& !props.state.isFetchingMore
			&& !props.owner.isReorderingItems
			&& !props.owner.isDeletingItem
			&& props.state.items.length > 1
		)
	}
	const moveItem = (itemId: number, offset: -1 | 1) => {
		const { items } = props.state
		const index = items.findIndex((item) => item.id === itemId)
		const targetIndex = index + offset

		if (index === -1 || targetIndex < 0 || targetIndex >= items.length) {
			return
		}

		const currentItemId = items[index]?.id
		const targetItemId = items[targetIndex]?.id

		if (currentItemId === undefined || targetItemId === undefined) {
			return
		}

		const itemIds = items.map((item) => item.id)
		itemIds[index] = targetItemId
		itemIds[targetIndex] = currentItemId
		props.controller.reorderItems(itemIds)
	}

	return (
		<ul class="flex flex-col gap-3">
			<For each={props.state.items}>
				{(item, index) => (
					<CollectionItemCard
						item={item}
						isEditing={props.isEditingItems}
						isDeleting={props.owner.isDeletingItem}
						isReordering={props.owner.isReorderingItems}
						canMoveUp={canReorderItems() && index() > 0}
						canMoveDown={
							canReorderItems() && index() < props.state.items.length - 1
						}
						onDelete={() => props.controller.deleteItem(item.id)}
						onMoveUp={() => moveItem(item.id, -1)}
						onMoveDown={() => moveItem(item.id, 1)}
					/>
				)}
			</For>
		</ul>
	)
}

type CollectionItemsProps = {
	model: CollectionDetailModel
	controller: CollectionDetailController
	isEditingItems: boolean
}

function CollectionItems(props: CollectionItemsProps) {
	const { t } = useLingui()

	return (
		<main class="flex flex-col gap-4">
			<Switch>
				<Match when={props.model.items.status === "loading"}>
					<div class="grid min-h-32 place-items-center rounded-sm border border-dashed border-slate-300 bg-slate-50/50">
						<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-tertiary shadow-xs ring-1 ring-slate-200 ring-inset">
							<span class="inline-block size-1.5 animate-pulse rounded-full bg-slate-300"></span>
							{t`Loading items...`}
						</div>
					</div>
				</Match>
				<Match when={props.model.items.status === "error"}>
					<div class="grid min-h-32 place-items-center rounded-sm border border-dashed border-red-200 bg-red-50/50">
						<div class="flex flex-col items-center gap-2">
							<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-red-600 shadow-xs ring-1 ring-red-200 ring-inset">
								<span class="inline-block size-1.5 rounded-full bg-red-400"></span>
								{t`Failed to load items.`}
							</div>
							<Button
								variant="SecondaryV2"
								size="Sm"
								onClick={props.controller.retryItems}
							>
								{t`Retry`}
							</Button>
						</div>
					</div>
				</Match>
				<Match
					when={
						props.model.items.status === "success"
							? props.model.items
							: undefined
					}
				>
					{(state) => (
						<>
							<Switch
								fallback={
									<ul class="flex flex-col gap-3">
										<For each={state().items}>
											{(item) => (
												<CollectionItemCard
													item={item}
													isEditing={false}
													isDeleting={false}
													isReordering={false}
													canMoveUp={false}
													canMoveDown={false}
													onDelete={() => undefined}
													onMoveUp={() => undefined}
													onMoveDown={() => undefined}
												/>
											)}
										</For>
									</ul>
								}
							>
								<Match when={state().items.length === 0}>
									<div class="grid min-h-32 place-items-center rounded-sm border border-dashed border-slate-300 bg-slate-50/50">
										<div class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm text-tertiary shadow-xs ring-1 ring-slate-200 ring-inset">
											<span class="inline-block size-1.5 rounded-full bg-slate-300"></span>
											{t`This collection is empty`}
										</div>
									</div>
								</Match>
								<Match
									when={
										props.model.viewer.role === "owner"
											? props.model.viewer
											: undefined
									}
								>
									{(owner) => (
										<OwnerItemsList
											state={state()}
											owner={owner()}
											controller={props.controller}
											isEditingItems={props.isEditingItems}
										/>
									)}
								</Match>
							</Switch>
							<div class="pt-2">
								<CollectionLoadMore
									when={state().hasMore || state().isFetchingMore}
									isLoading={state().isFetchingMore}
									onLoadMore={props.controller.loadMoreItems}
								/>
							</div>
						</>
					)}
				</Match>
			</Switch>
		</main>
	)
}

type Props = {
	model: CollectionDetailModel
	controller: CollectionDetailController
}

export function CollectionDetailPage(props: Props) {
	const [editOpen, setEditOpen] = createSignal(false)
	const [isEditingItems, setIsEditingItems] = createSignal(false)

	return (
		<div class="flex w-full flex-col gap-6">
			<CollectionDetailHeader
				model={props.model}
				controller={props.controller}
				isEditingItems={isEditingItems()}
				onEditCollection={() => setEditOpen(true)}
				onToggleEditingItems={() => setIsEditingItems((editing) => !editing)}
			/>
			<CollectionItems
				model={props.model}
				controller={props.controller}
				isEditingItems={isEditingItems()}
			/>
			<Show when={editOpen()}>
				<CollectionFormDialog
					open={editOpen()}
					onOpenChange={setEditOpen}
					collection={props.model.collection}
				/>
			</Show>
		</div>
	)
}
