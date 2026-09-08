import { useLingui } from "@lingui/solid/macro"
import * as stylex from "@stylexjs/stylex"
import { useMutation } from "@tanstack/solid-query"
import { createSignal, createUniqueId, Show, untrack } from "solid-js"

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
import { palette } from "~/style/color/palette.stylex"
import {
	radius,
	colors,
	lineHeights,
	fontSizes,
	px,
} from "~/style/tokens.stylex"

const styles = stylex.create({
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
	fieldGroup: { display: "flex", flexDirection: "column", gap: px[4] },
	label: {
		marginBottom: px[4],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		fontWeight: 500,
		color: palette.slate[700],
	},
	nameInput: {
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
		paddingLeft: px[12],
		paddingRight: px[12],
		paddingTop: px[8],
		paddingBottom: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		outlineStyle: { default: null, ":focus": "none" },
		boxShadow: { default: null, ":focus": "0 0 0 1px currentColor" },
	},
	descriptionInput: {
		height: px[96],
		resize: "none",
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
		paddingLeft: px[12],
		paddingRight: px[12],
		paddingTop: px[8],
		paddingBottom: px[8],
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		outlineStyle: { default: null, ":focus": "none" },
		boxShadow: { default: null, ":focus": "0 0 0 1px currentColor" },
	},
	visibility: {
		marginTop: px[8],
		display: "flex",
		alignItems: "center",
		gap: px[8],
	},
	visibilityCheckbox: {
		height: px[16],
		width: px[16],
		borderRadius: radius.sm,
		borderColor: palette.slate[300],
	},
	visibilityLabel: {
		fontSize: fontSizes.sm,
		lineHeight: lineHeights.sm,
		color: palette.slate[700],
	},
	submitError: { fontSize: fontSizes.sm, lineHeight: lineHeights.sm },
	actions: {
		display: "grid",
		width: { default: "100%", "@media (min-width: 40rem)": px[224] },
		gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
		gap: px[12],
		alignSelf: "flex-end",
	},
})

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	collection?: UserCollection
}

export function CollectionFormDialog(props: Props) {
	const { t } = useLingui()
	const formId = createUniqueId()
	const nameId = `${formId}-name`
	const descriptionId = `${formId}-description`
	const isPublicId = `${formId}-is-public`
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
				<Dialog.Content styles={styles.dialog}>
					<Dialog.Title styles={styles.title}>
						{props.collection ? t`Edit Collection` : t`Create Collection`}
					</Dialog.Title>

					<form
						onSubmit={handleSubmit}
						{...stylex.attrs(styles.form)}
					>
						<div {...stylex.attrs(styles.fieldGroup)}>
							<label
								for={nameId}
								{...stylex.attrs(styles.label)}
							>
								{t`Name`}
							</label>
							<input
								id={nameId}
								type="text"
								aria-label={t`Name`}
								value={name()}
								onInput={(e) => setName(e.currentTarget.value)}
								{...stylex.attrs(styles.nameInput)}
								required
								maxLength={100}
							/>
						</div>

						<div {...stylex.attrs(styles.fieldGroup)}>
							<label
								for={descriptionId}
								{...stylex.attrs(styles.label)}
							>
								{t`Description`}
							</label>
							<textarea
								id={descriptionId}
								aria-label={t`Description`}
								value={description()}
								onInput={(e) => setDescription(e.currentTarget.value)}
								{...stylex.attrs(styles.descriptionInput)}
								maxLength={1000}
							></textarea>
						</div>

						<div {...stylex.attrs(styles.visibility)}>
							<input
								type="checkbox"
								id={isPublicId}
								aria-label={t`Make this collection public`}
								checked={isPublic()}
								onChange={(e) => setIsPublic(e.currentTarget.checked)}
								{...stylex.attrs(styles.visibilityCheckbox)}
							/>
							<label
								for={isPublicId}
								{...stylex.attrs(styles.visibilityLabel)}
							>
								{t`Make this collection public`}
							</label>
						</div>

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
								disabled={mutation.isPending || !name().trim()}
							>
								{props.collection ? t`Save` : t`Create`}
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
	)
}
