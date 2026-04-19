import { t } from "@lingui/core/macro"
import type { UserProfile } from "@thc/api"
import { MathExt } from "@thc/toolkit"
import type { JSX } from "solid-js"
import { createMemo, Match, Show, Switch } from "solid-js"

import * as ImageCropDialog from "~/component/ImageCropDialog"
import { Badge } from "~/component/atomic/Badge"
import { Card } from "~/component/atomic/Card"
import { Link } from "~/component/atomic/Link"
import { Avatar } from "~/component/atomic/avatar"
import { Button } from "~/component/atomic/button"
import { InputField } from "~/component/atomic/form/Input"
import {
	USER_PROFILE_BANNER_MAX_HEIGHT,
	USER_PROFILE_BANNER_MAX_WIDTH,
	USER_PROFILE_BANNER_MIN_HEIGHT,
	USER_PROFILE_BANNER_MIN_WIDTH,
} from "~/constant/server"
import { PageLayout } from "~/layout/PageLayout"
import { imgUrl } from "~/utils/adapter/static_file"

import type {
	EditProfileBioStore,
	EditProfileImageStore,
	EditProfileStore,
} from "./store"

export { createEditProfileStore } from "./store"

export type EditProfileViewProps = {
	user: UserProfile
	store: EditProfileStore
}

const formatDateTime = (value: string) => {
	const date = new Date(value)

	if (Number.isNaN(date.getTime())) {
		return value
	}

	return new Intl.DateTimeFormat(undefined, {
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	}).format(date)
}

const computeAvatarOutputSize = (
	rawWidth: number,
	rawHeight: number,
): { width: number; height: number } | undefined => {
	const rawSize = Math.min(rawWidth, rawHeight)
	const minSize = 128
	const next = Math.round(Math.max(rawSize, minSize))
	if (!Number.isFinite(next) || next <= 0) return
	return { width: next, height: next }
}

const computeBannerOutputSize = (
	rawWidth: number,
): { width: number; height: number } | undefined => {
	const ratio = 3
	const width = Math.round(
		MathExt.clamp(
			USER_PROFILE_BANNER_MIN_WIDTH,
			USER_PROFILE_BANNER_MAX_WIDTH,
			rawWidth,
		),
	)
	const height = MathExt.clamp(
		USER_PROFILE_BANNER_MIN_HEIGHT,
		USER_PROFILE_BANNER_MAX_HEIGHT,
		Math.round(width / ratio),
	)
	const normalizedHeight = Math.round(height)
	if (!Number.isFinite(normalizedHeight) || normalizedHeight <= 0) return

	const normalizedWidth = normalizedHeight * ratio
	if (
		normalizedWidth < USER_PROFILE_BANNER_MIN_WIDTH
		|| normalizedWidth > USER_PROFILE_BANNER_MAX_WIDTH
	) {
		return
	}

	return { width: normalizedWidth, height: normalizedHeight }
}

export function EditProfileView(props: EditProfileViewProps) {
	return (
		<PageLayout class="grid min-h-dvh grid-rows-[auto_1fr]">
			<EditProfileHeader isBioDirty={props.store.bio.isDirty} />

			<div class="grid gap-6 p-8">
				<AppearanceCard
					user={props.user}
					avatar={props.store.avatar}
					banner={props.store.banner}
				/>

				<BioEditorCard bio={props.store.bio} />
			</div>

			<ImageCropDialog.Root
				open={props.store.avatar.isOpen}
				syncOpen={props.store.avatar.setIsOpen}
				ratio={1}
				computeOutputSize={computeAvatarOutputSize}
				busy={props.store.avatar.isUploading}
				error={props.store.avatar.error}
				onSave={props.store.avatar.onUpload}
				title={t`Update avatar`}
			>
				<ImageCropDialog.Canvas class="h-96" />
			</ImageCropDialog.Root>

			<ImageCropDialog.Root
				open={props.store.banner.isOpen}
				syncOpen={props.store.banner.setIsOpen}
				ratio={3}
				computeOutputSize={(rawWidth) => computeBannerOutputSize(rawWidth)}
				busy={props.store.banner.isUploading}
				error={props.store.banner.error}
				onSave={props.store.banner.onUpload}
				title={t`Update banner`}
			>
				<ImageCropDialog.Canvas class="h-80" />
			</ImageCropDialog.Root>
		</PageLayout>
	)
}

function EditProfileHeader(props: { isBioDirty: boolean }) {
	return (
		<header class="relative overflow-hidden border-b border-slate-300 bg-primary/70 px-8 py-6">
			<div class="pointer-events-none absolute inset-0 opacity-65 bg-[linear-gradient(to_right,rgba(15,23,42,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.06)_1px,transparent_1px)] bg-size-[26px_26px]"></div>
			<div class="flex justify-between items-center">
				<h1 class="truncate text-3xl font-light tracking-tight text-primary">
					Edit profile
				</h1>
				<Show when={props.isBioDirty}>
					<Badge
						color="Marisa"
						class="mt-3"
					>
						Unsaved
					</Badge>
				</Show>

				<Link
					to="/profile"
					class="text-sm text-secondary hover:text-primary"
				>
					Back to profile
				</Link>
			</div>
		</header>
	)
}

function AppearanceCard(props: {
	user: UserProfile
	avatar: EditProfileImageStore
	banner: EditProfileImageStore
}) {
	const bannerUrl = createMemo(() => imgUrl(props.user.banner_url))
	const handleEditBanner = () => {
		if (props.banner.isUploading) return
		props.banner.setIsOpen(true)
	}
	const handleEditAvatar = () => {
		if (props.avatar.isUploading) return
		props.avatar.setIsOpen(true)
	}

	return (
		<Card class="overflow-hidden border border-slate-300 p-0 shadow-xs">
			<div class="flex items-center justify-between gap-4 border-b border-slate-300 bg-slate-50 px-5 py-4">
				<div class="text-xs font-medium tracking-[0.22em] text-slate-600">
					APPEARANCE
				</div>
				<Button
					size="Sm"
					variant="SecondaryV2"
					class="px-3"
					disabled={props.banner.isUploading}
					onClick={handleEditBanner}
				>
					<Switch>
						<Match when={props.banner.isUploading}>{t`Uploading…`}</Match>
						<Match when={!props.banner.isUploading}>{t`Update banner`}</Match>
					</Switch>
				</Button>
			</div>

			<section class="border-b border-slate-300">
				<div class="relative h-56 overflow-hidden bg-slate-100">
					<Show
						when={bannerUrl()}
						fallback={
							<div class="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(248,250,252,0.95),rgba(226,232,240,1))]"></div>
						}
					>
						{(src) => (
							<img
								src={src()}
								alt={t`Profile banner`}
								class="absolute inset-0 size-full object-cover"
							/>
						)}
					</Show>
					<div class="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,rgba(15,23,42,0.40)_100%)]"></div>
				</div>

				<div class="px-5 pt-5 pb-6">
					<div class="grid gap-5 lg:grid-cols-[auto_1fr] lg:items-end">
						<div class="-mt-14 relative z-10 w-fit rounded-md border border-slate-300 bg-primary p-2 shadow-xs">
							<Avatar
								user={props.user}
								class="size-24"
							/>
						</div>

						<Button
							size="Sm"
							variant="SecondaryV2"
							class="px-3 w-fit"
							disabled={props.avatar.isUploading}
							onClick={handleEditAvatar}
						>
							<Switch>
								<Match when={props.avatar.isUploading}>{t`Uploading…`}</Match>
								<Match when={!props.avatar.isUploading}>
									{t`Update avatar`}
								</Match>
							</Switch>
						</Button>
					</div>
				</div>
			</section>
		</Card>
	)
}

function BioEditorCard(props: { bio: EditProfileBioStore }) {
	const count = createMemo(() => props.bio.value.length)
	const savedAt = createMemo(() => {
		const value = props.bio.savedAt
		if (!value) return
		return formatDateTime(value)
	})

	const isDisabled = () => !props.bio.isDirty || props.bio.isSaving

	const handleInput: JSX.EventHandlerUnion<HTMLTextAreaElement, InputEvent> = (
		evt,
	) => {
		props.bio.onInput(evt.currentTarget.value)
	}

	return (
		<Card class="border border-slate-300 p-0 shadow-xs">
			<div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-300 bg-slate-50 px-5 py-4">
				<div class="text-xs font-medium tracking-[0.22em] text-slate-600">
					BIO
				</div>

				<div class="flex flex-wrap items-center gap-2">
					<div class="font-mono text-xs text-slate-500">{count()} chars</div>
					<Show when={savedAt()}>
						{(label) => (
							<div class="font-mono text-xs text-slate-400">
								saved {label()}
							</div>
						)}
					</Show>
				</div>
			</div>

			<div class="p-5">
				<InputField.Root class="gap-2">
					<InputField.Textarea
						value={props.bio.value}
						onInput={handleInput}
						placeholder={t`Write something about you.`}
						class="min-h-48"
					/>
				</InputField.Root>

				<Show when={props.bio.error}>
					{(error) => (
						<div class="mt-3 rounded-md border border-reimu-200 bg-reimu-50 px-3 py-2 text-sm text-reimu-800">
							{error()}
						</div>
					)}
				</Show>

				<div class="grid grid-cols-2 gap-2 size-fit ml-auto mt-2">
					<Button
						variant="SecondaryV2"
						size="Sm"
						class="px-3"
						disabled={isDisabled()}
						onClick={() => {
							if (isDisabled()) return
							props.bio.onReset()
						}}
					>
						Discard
					</Button>
					<Button
						variant="Primary"
						color="Reimu"
						size="Sm"
						class="px-4"
						disabled={isDisabled()}
						onClick={() => {
							if (isDisabled()) return
							void props.bio.onSave()
						}}
					>
						<Switch>
							<Match when={props.bio.isSaving}>{t`Saving…`}</Match>
							<Match when={!props.bio.isSaving}>{t`Save bio`}</Match>
						</Switch>
					</Button>
				</div>
			</div>
		</Card>
	)
}
