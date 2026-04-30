import { useLingui } from "@lingui/solid/macro"
import { useMutation } from "@tanstack/solid-query"
import { createSignal, Show, untrack } from "solid-js"

import { Button } from "~/component/atomic/button"
import { Dialog } from "~/component/dialog"
import { showSuccessToast } from "~/component/toast"
import type { UserCollection } from "~/hey-api"
import { createUserCollection, updateUserCollection } from "~/hey-api"
import {
	userCollectionDetailQueryKey,
	userCollectionsQueryKey,
} from "~/hey-api/@tanstack/solid-query.gen"
import { QUERY_CLIENT } from "~/state/tanstack"

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	collection?: UserCollection
}

export function CollectionFormDialog(props: Props) {
	const { t } = useLingui()
	const [name, setName] = createSignal(
		untrack(() => props.collection?.name ?? ""),
	)
	const [description, setDescription] = createSignal(
		untrack(() => props.collection?.description ?? ""),
	)
	const [isPublic, setIsPublic] = createSignal(
		untrack(() => props.collection?.is_public ?? false),
	)

	const mutation = useMutation(() => ({
		mutationFn: async () => {
			if (props.collection) {
				return updateUserCollection({
					path: { id: props.collection.id },
					body: {
						name: name(),
						description: description(),
						is_public: isPublic(),
					},
					throwOnError: true,
				})
			} else {
				return createUserCollection({
					body: {
						name: name(),
						description: description(),
						is_public: isPublic(),
					},
					throwOnError: true,
				})
			}
		},
		onSuccess: (result) => {
			const isCreating = props.collection === undefined
			void QUERY_CLIENT.invalidateQueries({
				queryKey: userCollectionsQueryKey({
					path: { username: result.data.data.owner.name },
				}),
			})
			if (props.collection) {
				void QUERY_CLIENT.invalidateQueries({
					queryKey: userCollectionDetailQueryKey({
						path: { id: props.collection.id },
					}),
				})
			}
			if (isCreating) {
				showSuccessToast({
					title: t`Collection created`,
					description: t`It is now available on your profile`,
				})
			}
			props.onOpenChange(false)
		},
	}))

	const handleSubmit = (e: Event) => {
		e.preventDefault()
		if (!name().trim()) return
		mutation.mutate()
	}

	return (
		<Dialog.Root
			open={props.open}
			onOpenChange={props.onOpenChange}
		>
			<Dialog.Portal>
				<Dialog.Overlay data-blur />
				<Dialog.Content class="flex w-full max-w-md flex-col rounded-md bg-white p-6 shadow-xl">
					<Dialog.Title class="mb-2 text-xl font-light tracking-tight text-primary">
						{props.collection ? t`Edit Collection` : t`Create Collection`}
					</Dialog.Title>

					<form
						onSubmit={handleSubmit}
						class="flex flex-col gap-4"
					>
						<div class="flex flex-col gap-1">
							<label class="mb-1 text-sm font-medium text-slate-700">
								{t`Name`}
							</label>
							<input
								type="text"
								value={name()}
								onInput={(e) => setName(e.currentTarget.value)}
								class="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
								required
								maxLength={100}
							/>
						</div>

						<div class="flex flex-col gap-1">
							<label class="mb-1 text-sm font-medium text-slate-700">
								{t`Description`}
							</label>
							<textarea
								value={description()}
								onInput={(e) => setDescription(e.currentTarget.value)}
								class="h-24 resize-none rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
								maxLength={1000}
							></textarea>
						</div>

						<div class="mt-2 flex items-center gap-2">
							<input
								type="checkbox"
								id="isPublic"
								checked={isPublic()}
								onChange={(e) => setIsPublic(e.currentTarget.checked)}
								class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
							/>
							<label
								for="isPublic"
								class="text-sm text-slate-700"
							>
								{t`Make this collection public`}
							</label>
						</div>

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
								onClick={() => props.onOpenChange(false)}
								disabled={mutation.isPending}
							>
								{t`Cancel`}
							</Button>
							<Button
								type="submit"
								variant="Primary"
								size="Md"
								disabled={mutation.isPending || !name().trim()}
							>
								{props.collection ? t`Save` : t`Create`}
							</Button>
						</div>
					</form>
					<Dialog.CloseButton />
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	)
}
