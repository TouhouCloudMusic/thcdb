import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useQueryClient } from "@tanstack/solid-query"
import type { QueryClient, UseMutationResult } from "@tanstack/solid-query"
import { Link, notFound, useNavigate } from "@tanstack/solid-router"
import type { CorrectionMutation } from "@thc/query"
import { createSignal, Show } from "solid-js"
import type { ParentProps } from "solid-js"
import * as v from "valibot"

import { Button, buttonStyles } from "~/component/atomic/button"
import { pendingCorrectionOptions } from "~/hey-api/@tanstack/solid-query.gen"
import type { PendingCorrectionData } from "~/hey-api/types.gen"
import { palette } from "~/style/color/palette.stylex"
import { link } from "~/style/link"
import { surfaceStyles } from "~/style/primitives"
import { colors, lineHeights, fontSizes, px } from "~/style/tokens.stylex"

const styles = stylex.create({
	loading: {
		display: "flex",
		minHeight: px[384],
		alignItems: "center",
		justifyContent: "center",
		paddingTop: px[32],
		paddingRight: px[32],
		paddingBottom: px[32],
		paddingLeft: px[32],
	},
	card: {
		width: "100%",
		maxWidth: px[448],
		overflow: "hidden",
		borderTopWidth: "1px",
		borderTopStyle: "solid",
		borderRightWidth: "1px",
		borderRightStyle: "solid",
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		borderLeftWidth: "1px",
		borderLeftStyle: "solid",
		borderColor: palette.slate[300],
		paddingTop: 0,
		paddingRight: 0,
		paddingBottom: 0,
		paddingLeft: 0,
		boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
	},
	header: {
		borderBottomWidth: "1px",
		borderBottomStyle: "solid",
		display: "flex",
		alignItems: "center",
		justifyContent: "space-between",
		borderColor: palette.slate[300],
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[12],
		paddingBottom: px[12],
	},
	title: {
		fontSize: fontSizes.xs,
		lineHeight: lineHeights.xs,
		fontWeight: 500,
		letterSpacing: ".05em",
		color: palette.slate[600],
		textTransform: "uppercase",
	},
	body: {
		paddingLeft: px[16],
		paddingRight: px[16],
		paddingTop: px[16],
		paddingBottom: px[16],
	},
	description: {
		fontSize: fontSizes.sm,
		lineHeight: "1.5rem",
		color: colors.textSecondary,
	},
	actions: {
		marginTop: px[16],
		display: "flex",
		flexWrap: "wrap",
		justifyContent: "flex-end",
		gap: px[8],
	},
})

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
				<div {...stylex.attrs(styles.loading)}>
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
		<div {...stylex.attrs(surfaceStyles.card, styles.card)}>
			<div {...stylex.attrs(styles.header)}>
				<span {...stylex.attrs(styles.title)}>
					{t`Pending correction exists`}
				</span>
			</div>
			<div {...stylex.attrs(styles.body)}>
				<p {...stylex.attrs(styles.description)}>
					{t`This entity already has a pending correction. You can review that correction or go back.`}
				</p>
				<div {...stylex.attrs(styles.actions)}>
					<Button
						onClick={props.onBack}
						appearance="soft"
						tone="gray"
						size="sm"
					>
						{t`Back`}
					</Button>
					<Link
						to="/correction/$id"
						params={{ id: props.correctionId.toString() }}
						class={
							stylex.attrs(
								link.base,
								buttonStyles.base,
								buttonStyles.solid,
								buttonStyles.gray,
								buttonStyles.sm,
							).class
						}
					>
						{t`View correction`}
					</Link>
				</div>
			</div>
		</div>
	)
}
