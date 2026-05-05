import { useLingui } from "@lingui/solid/macro"
import { useQueryClient } from "@tanstack/solid-query"
import type { QueryClient, UseMutationResult } from "@tanstack/solid-query"
import { notFound, useNavigate } from "@tanstack/solid-router"
import type { CorrectionMutation } from "@thc/query"
import { createSignal, Show } from "solid-js"
import type { ParentProps } from "solid-js"
import * as v from "valibot"

import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { Button, ButtonClass_new } from "~/component/atomic/button"
import { pendingCorrectionOptions } from "~/hey-api/@tanstack/solid-query.gen"
import type { PendingCorrectionData } from "~/hey-api/types.gen"

export type PendingCorrectionEntityType =
	PendingCorrectionData["path"]["entity_type"]

type PendingCorrectionNoticeProps = {
	correctionId: number
	onBack: () => void
}

type PendingCorrectionBoundaryProps = ParentProps<{
	correctionId?: number | null
	onBack?: () => void
}>

export const pendingCorrectionEditSearchSchema = v.object({
	correctionId: v.fallback(v.optional(v.number()), undefined),
})

function pendingCorrectionQuery(
	entityType: PendingCorrectionEntityType,
	entityId: number,
) {
	return pendingCorrectionOptions({
		path: { entity_type: entityType, id: entityId },
	})
}

export async function invalidatePendingCorrection(
	queryClient: QueryClient,
	entityType: PendingCorrectionEntityType,
	entityId: number,
) {
	const query = pendingCorrectionQuery(entityType, entityId)
	await queryClient.invalidateQueries({
		queryKey: query.queryKey,
		refetchType: "none",
	})
}

export async function fetchLatestPendingCorrectionId(
	queryClient: QueryClient,
	entityType: PendingCorrectionEntityType,
	entityId: number,
) {
	const query = pendingCorrectionQuery(entityType, entityId)
	await invalidatePendingCorrection(queryClient, entityType, entityId)
	const response = await queryClient.fetchQuery(query)
	return response.data
}

export async function checkPendingCorrectionConflict(
	queryClient: QueryClient,
	entityType: PendingCorrectionEntityType,
	entityId: number,
	revisionCorrectionId?: number,
) {
	const pendingCorrectionId = await fetchLatestPendingCorrectionId(
		queryClient,
		entityType,
		entityId,
	)

	return {
		editCorrectionId: revisionCorrectionId,
		blockingCorrectionId:
			revisionCorrectionId === undefined ? pendingCorrectionId : undefined,
		isInvalidRevision:
			revisionCorrectionId !== undefined
			&& pendingCorrectionId !== revisionCorrectionId,
	}
}

export function getEditSearchDeps({
	search,
}: {
	search: v.InferOutput<typeof pendingCorrectionEditSearchSchema>
}) {
	return {
		correctionId: search.correctionId,
	}
}

export async function ensurePendingCorrectionEditable(
	queryClient: QueryClient,
	entityType: PendingCorrectionEntityType,
	entityId: number,
	revisionCorrectionId?: number,
) {
	const { isInvalidRevision, ...pendingCorrectionGate } =
		await checkPendingCorrectionConflict(
			queryClient,
			entityType,
			entityId,
			revisionCorrectionId,
		)
	if (isInvalidRevision) {
		throw notFound()
	}

	return pendingCorrectionGate
}

type EditProps<TEntity extends { id: number }> =
	| { type: "new" }
	| {
			type: "edit"
			entity: TEntity
			pendingCorrectionId?: number
	  }

type CorrectionSubmitResult = CorrectionMutation.CorrectionSubmitResult
type EntityMutationParams<TData> =
	CorrectionMutation.EntityCorrectionMutationParams<TData>

type EntityFormSubmitConfig<
	TEntity extends { id: number },
	TData,
	TMutation extends UseMutationResult<
		CorrectionSubmitResult,
		Error,
		EntityMutationParams<TData>
	>,
> = {
	entityType: PendingCorrectionEntityType
	mutation: TMutation
	props: EditProps<TEntity>
	onCreateSuccess?: (result: CorrectionSubmitResult) => void | Promise<void>
	onUpdateSuccess?: (result: CorrectionSubmitResult) => void | Promise<void>
	onError?: (error: unknown, type: "create" | "update") => boolean | undefined
}

export function createEntityFormSubmit<
	TEntity extends { id: number },
	TData,
	TMutation extends UseMutationResult<
		CorrectionSubmitResult,
		Error,
		EntityMutationParams<TData>
	> = UseMutationResult<
		CorrectionSubmitResult,
		Error,
		EntityMutationParams<TData>
	>,
>(config: EntityFormSubmitConfig<TEntity, TData, TMutation>) {
	const navigator = useNavigate()
	const queryClient = useQueryClient()
	const entityId = () => {
		if (config.props.type === "edit") return config.props.entity.id
	}

	const [pendingCorrectionId, setPendingCorrectionId] = createSignal<number>()

	const invalidateCurrentPendingCorrection = async () => {
		const currentEntityId = entityId()
		if (currentEntityId === undefined) return

		await invalidatePendingCorrection(
			queryClient,
			config.entityType,
			currentEntityId,
		)
	}

	const navigateToCorrection = (correctionId: number) => {
		void navigator({
			to: "/correction/$id",
			params: { id: correctionId.toString() },
		})
	}

	const handleSubmitResult = (
		result: CorrectionSubmitResult,
		onSuccess?: (result: CorrectionSubmitResult) => void | Promise<void>,
	) => {
		if (result.kind === "Conflict") {
			setPendingCorrectionId(result.correction_id)
			return
		}

		void onSuccess?.(result)
		navigateToCorrection(result.correction_id)
	}

	const handleSubmit = (data: TData) => {
		if (config.props.type === "new") {
			config.mutation.mutate(
				{ type: "Create", data },
				{
					onSuccess(result) {
						handleSubmitResult(result, config.onCreateSuccess)
					},
					onError(error) {
						if (config.onError?.(error, "create") === false) return
						if (import.meta.env.DEV) {
							console.error(`Failed to create ${config.entityType}:`, error)
						}
					},
				},
			)
			return
		}

		config.mutation.mutate(
			{
				type: "Update",
				id: config.props.entity.id,
				correctionId: config.props.pendingCorrectionId,
				data,
			},
			{
				onSuccess(result) {
					void invalidateCurrentPendingCorrection()
					handleSubmitResult(result, config.onUpdateSuccess)
				},
				onError(error) {
					if (config.onError?.(error, "update") === false) return
					if (import.meta.env.DEV) {
						console.error(`Failed to update ${config.entityType}:`, error)
					}
				},
			},
		)
	}

	return {
		handleSubmit,
		mutation: config.mutation,
		pendingCorrectionId,
	}
}

export function PendingCorrectionBoundary(
	props: PendingCorrectionBoundaryProps,
) {
	const onBack = () => {
		if (props.onBack) {
			props.onBack()
		} else {
			globalThis.history.back()
		}
	}

	return (
		<Show
			when={props.correctionId}
			fallback={props.children}
		>
			{(correctionId) => (
				<div class="flex min-h-96 items-center justify-center p-8">
					<PendingCorrectionNoticePanel
						correctionId={correctionId()}
						onBack={onBack}
					/>
				</div>
			)}
		</Show>
	)
}

export function PendingCorrectionNoticePanel(
	props: PendingCorrectionNoticeProps,
) {
	const { t } = useLingui()

	return (
		<Card class="w-full max-w-md overflow-hidden border border-slate-300 p-0 shadow-xs">
			<div class="flex items-center justify-between border-b border-slate-300 bg-slate-50 px-4 py-3">
				<span class="text-xs font-medium tracking-wider text-slate-600 uppercase">
					{t`Pending correction exists`}
				</span>
			</div>
			<div class="px-4 py-4">
				<p class="text-sm leading-6 text-secondary">
					{t`This entity already has a pending correction. You can review that correction or go back.`}
				</p>
				<div class="mt-4 flex flex-wrap justify-end gap-2">
					<Button
						variant="Secondary"
						size="Sm"
						onClick={props.onBack}
					>
						{t`Back`}
					</Button>
					<Link
						to="/correction/$id"
						params={{ id: props.correctionId.toString() }}
						underline={false}
						class={ButtonClass_new({ variant: "Primary", size: "Sm" })}
					>
						{t`View correction`}
					</Link>
				</div>
			</div>
		</Card>
	)
}
