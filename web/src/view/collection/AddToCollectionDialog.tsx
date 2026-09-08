import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useInfiniteQuery, useMutation } from "@tanstack/solid-query"
import type {
	InfiniteData,
	UseInfiniteQueryResult,
} from "@tanstack/solid-query"
import { PlusIcon } from "@thc/icons/radix"
import { createSignal, createUniqueId, For, Show } from "solid-js"
import type { Accessor } from "solid-js"
import { createStore, produce } from "solid-js/store"

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
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"
import { getNextPageParam } from "~/utils/query"

import { CollectionFormDialog } from "./CollectionFormDialog"
import { CollectionLoadMore } from "./CollectionLoadMore"

const styles = stylex.create({
	fieldGroup: { display: "flex", flexDirection: "column", gap: px[4] },
	collectionLabel: {
		marginBottom: px[4],
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		gap: px[12],
	},
	fieldLabel: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: palette.slate[700],
	},
	createCollection: {
		display: "inline-flex",
		alignItems: "center",
		gap: px[4],
		paddingLeft: px[8],
		paddingRight: px[8],
	},
	plusIcon: { width: px[16], height: px[16] },
	collectionSelect: {
		borderRadius: radius.md,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		paddingLeft: px[8],
		paddingRight: px[8],
		paddingTop: px[8],
		paddingBottom: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		outlineStyle: { default: null, ":focus": "none" },
		backgroundColor: { default: null, ":disabled": palette.slate[100] },
		color: { default: null, ":disabled": palette.slate[500] },
		width: "100%",
		boxShadow: { default: null, ":focus": "0 0 0 1px currentColor" },
	},
	emptyCollections: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		color: palette.slate[500],
	},
	collectionsError: { fontSize: fontSizes.xs, lineHeight: lineHeights.xs },
	descriptionLabel: {
		marginBottom: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: palette.slate[700],
	},
	descriptionInput: {
		borderRadius: radius.md,
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		paddingLeft: px[8],
		paddingRight: px[8],
		paddingTop: px[8],
		paddingBottom: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		outlineStyle: { default: null, ":focus": "none" },
		backgroundColor: { default: null, ":disabled": palette.slate[100] },
		color: { default: null, ":disabled": palette.slate[500] },
		height: px[96],
		resize: "none",
		boxShadow: { default: null, ":focus": "0 0 0 1px currentColor" },
	},
	dialog: {
		display: "flex",
		width: "100%",
		maxWidth: px[448],
		flexDirection: "column",
		borderRadius: radius.md,
		backgroundColor: palette.white,
		paddingTop: px[24],
		paddingRight: px[24],
		paddingBottom: px[24],
		paddingLeft: px[24],
		boxShadow:
			"0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
	},
	title: {
		marginBottom: px[8],
		fontSize: fontSizes.xl,
		lineHeight: lineHeights.xl,
		fontWeight: 300,
		letterSpacing: "-0.025em",
		color: colors.textPrimary,
	},
	form: { display: "flex", flexDirection: "column", gap: px[16] },
	submitError: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm },
	actions: {
		display: "grid",
		width: { default: "100%", "@media (min-width: 40rem)": px[224] },
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: px[12],
		alignSelf: "flex-end",
	},
	dialogAction: { paddingLeft: px[8], paddingRight: px[8] },
})

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
		<div {...stylex.attrs(styles.fieldGroup)}>
			<div {...stylex.attrs(styles.collectionLabel)}>
				<label
					for={selectId}
					{...stylex.attrs(styles.fieldLabel)}
				>
					{t`Collection`}
				</label>
				<Button
					type="button"
					appearance="outline"
					tone="slate"
					size="sm"
					styles={styles.createCollection}
					onClick={props.onCreateCollection}
				>
					<PlusIcon {...stylex.attrs(styles.plusIcon)} />
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
				{...stylex.attrs(styles.collectionSelect)}
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
				<p
					{...stylex.attrs(styles.emptyCollections)}
				>{t`No collections yet.`}</p>
			</Show>
			<Show when={props.collectionsQuery.isError}>
				<p
					{...stylex.attrs(styles.collectionsError)}
				>{t`Failed to load collections.`}</p>
			</Show>
			<CollectionLoadMore
				when={
					props.collectionsQuery.hasNextPage
					|| props.collectionsQuery.isFetchingNextPage
				}
				isLoading={props.collectionsQuery.isFetchingNextPage}
				appearance="soft"
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
		<div {...stylex.attrs(styles.fieldGroup)}>
			<label
				for={noteId}
				{...stylex.attrs(styles.descriptionLabel)}
			>
				{t`Note (optional)`}
			</label>
			<textarea
				id={noteId}
				aria-label={t`Note (optional)`}
				value={props.description}
				onInput={(e) => props.onDescriptionInput(e.currentTarget.value)}
				{...stylex.attrs(styles.descriptionInput)}
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
		const username = userCtx.profile?.name

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

			invalidateUserCollectionQueries(collectionId, userCtx.profile?.name)
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
					<Dialog.Content styles={styles.dialog}>
						<Dialog.Title styles={styles.title}>
							{t`Add to Collection`}
						</Dialog.Title>

						<form
							onSubmit={handleSubmit}
							{...stylex.attrs(styles.form)}
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
								<div {...stylex.attrs(styles.submitError)}>
									{mutation.error?.message
										?? t`An error occurred. Please try again.`}
								</div>
							</Show>

							<div {...stylex.attrs(styles.actions)}>
								<Button
									type="button"
									appearance="soft"
									tone="gray"
									size="md"
									styles={styles.dialogAction}
									onClick={() => props.onOpenChange(false)}
									disabled={mutation.isPending}
								>
									{t`Cancel`}
								</Button>
								<Button
									type="submit"
									appearance="solid"
									tone="gray"
									size="md"
									styles={styles.dialogAction}
									disabled={
										mutation.isPending
										|| formStore.selectedCollectionId === undefined
									}
								>
									{t`Add`}
								</Button>
							</div>
						</form>
						<Dialog.CloseButton
							as={Button}
							appearance="ghost"
							tone="gray"
						/>
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
