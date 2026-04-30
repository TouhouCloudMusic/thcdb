import { useLingui } from "@lingui/solid/macro"

export type ImageDropProps = {
	croppieOption?: unknown
	onSave: (base64: string) => void
}

export function ImageCropper(props: ImageDropProps) {
	const { t } = useLingui()
	return (
		<div class="flex flex-col items-center gap-4">
			<div class="w-full h-64 bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center">
				<p class="text-gray-500">{t`Image Cropper Placeholder`}</p>
			</div>
			<button
				type="button"
				class="px-4 py-2 bg-blue-600 text-white rounded"
				onClick={() => props.onSave("data:image/png;base64,...")}
			>
				Save Image
			</button>
		</div>
	)
}
