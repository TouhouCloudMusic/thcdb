import * as Toast from "@kobalte/core/toast"
import { useLingui } from "@lingui/solid/macro"
import type { JSX } from "solid-js"
import { Show, splitProps } from "solid-js"
import type { IconProps } from "solid-radix-icons"
import {
	CheckIcon,
	Cross1Icon,
	InfoCircledIcon,
	ExclamationTriangleIcon,
} from "solid-radix-icons"
import { twMerge } from "tailwind-merge"

type ToastTone = "notification" | "success" | "error"

type ShowToastOptions = {
	title: string
	description?: string
	tone: ToastTone
}

type AppToastProps = Toast.ToastComponentProps & ShowToastOptions

type ToastToneStyle = {
	toast: string
	accentLine: string
	iconWrapper: string
	close: string
	progressFill: string
	Icon: (props: IconProps) => JSX.Element
}

const TOAST_TONE_STYLES = {
	notification: {
		toast: "border-slate-300 focus-visible:ring-slate-600",
		accentLine: "bg-slate-600",
		iconWrapper: "bg-slate-100 text-slate-700 ring-slate-200",
		close: "focus-visible:outline-slate-600",
		progressFill: "bg-slate-600",
		Icon: InfoCircledIcon,
	},
	success: {
		toast: "border-green-300 focus-visible:ring-green-600",
		accentLine: "bg-green-600",
		iconWrapper: "bg-green-100 text-green-700 ring-green-200",
		close: "focus-visible:outline-green-600",
		progressFill: "bg-green-600",
		Icon: CheckIcon,
	},
	error: {
		toast: "border-reimu-300 focus-visible:ring-reimu-600",
		accentLine: "bg-reimu-600",
		iconWrapper: "bg-reimu-100 text-reimu-700 ring-reimu-200",
		close: "focus-visible:outline-reimu-600",
		progressFill: "bg-reimu-600",
		Icon: ExclamationTriangleIcon,
	},
} satisfies Record<ToastTone, ToastToneStyle>

export function showToast(options: ShowToastOptions) {
	return Toast.toaster.show((props) => (
		<AppToast
			{...props}
			{...options}
		/>
	))
}

export function showNotificationToast(options: Omit<ShowToastOptions, "tone">) {
	return showToast({ ...options, tone: "notification" })
}

export function showSuccessToast(options: Omit<ShowToastOptions, "tone">) {
	return showToast({ ...options, tone: "success" })
}

export function showErrorToast(options: Omit<ShowToastOptions, "tone">) {
	return showToast({ ...options, tone: "error" })
}

export function AppToastRegion() {
	const { t } = useLingui()
	return (
		<Toast.Region
			aria-label={t`Notifications ({hotkey})`}
			duration={3600}
			limit={3}
			class="fixed right-4 top-4 z-50 w-[min(380px,calc(100vw-2rem))]"
		>
			<Toast.List class="flex flex-col gap-2" />
		</Toast.Region>
	)
}

function AppToast(props: AppToastProps) {
	const [local, rootProps] = splitProps(props, ["title", "description", "tone"])
	const tone = () => TOAST_TONE_STYLES[local.tone]

	return (
		<Toast.Root
			{...rootProps}
			class={twMerge(
				"relative grid grid-cols-[auto_1fr_auto] items-start gap-3 bg-white/95 py-3 pl-4 pr-3 text-sm shadow-4 outline-none backdrop-blur-sm transition data-closed:animate-fade-out data-opened:animate-fade-in motion-reduce:animate-none motion-reduce:transition-none border focus-visible:ring-2 focus-visible:ring-offset-2",
				tone().toast,
			)}
		>
			<div
				class={twMerge(
					"absolute -bottom-px -left-px -top-px w-1 z-10",
					tone().accentLine,
				)}
			></div>
			<ToastIcon tone={local.tone} />
			<div class="min-w-0 space-y-1">
				<Toast.Title class="text-sm font-medium leading-5 text-slate-900">
					{local.title}
				</Toast.Title>
				<Show when={local.description}>
					{(description) => (
						<Toast.Description class="mt-0.5 text-sm leading-5 text-slate-600">
							{description()}
						</Toast.Description>
					)}
				</Show>
			</div>
			<Toast.CloseButton
				class={twMerge(
					"-mr-1 -mt-1 grid size-7 shrink-0 place-items-center text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 motion-reduce:transition-none",
					tone().close,
				)}
			>
				<Cross1Icon
					aria-hidden="true"
					class="size-4"
				/>
			</Toast.CloseButton>
			<Toast.ProgressTrack class="absolute -bottom-px -left-px -right-px h-[1.5px] z-10 bg-transparent">
				<Toast.ProgressFill
					class={twMerge(
						"h-full w-(--kb-toast-progress-fill-width)",
						tone().progressFill,
					)}
				/>
			</Toast.ProgressTrack>
		</Toast.Root>
	)
}

function ToastIcon(props: { tone: ToastTone }) {
	const styles = () => TOAST_TONE_STYLES[props.tone]

	return (
		<span
			class={twMerge(
				"mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ring-1",
				styles().iconWrapper,
			)}
		>
			{styles().Icon({
				"aria-hidden": "true",
				class: "size-4",
			})}
		</span>
	)
}
