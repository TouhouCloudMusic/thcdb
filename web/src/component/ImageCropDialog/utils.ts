export type FileSizeRange = {
	min: number
	max: number
}

type FileLike = Pick<File, "size" | "type">

type ValidateImageFileMessages = {
	unsupportedType: string
	tooSmall: (minimum: string) => string
	tooLarge: (maximum: string) => string
}

function isSupportedImageType(file: FileLike) {
	return file.type === "image/png" || file.type === "image/jpeg"
}

export function formatBytes(bytes: number) {
	if (!Number.isFinite(bytes)) return ""
	if (bytes < 1024) return `${bytes} B`
	const kb = bytes / 1024
	if (kb < 1024) return `${kb.toFixed(1)} KB`
	const mb = kb / 1024
	return `${mb.toFixed(1)} MB`
}

export function validateImageFile(
	file: FileLike,
	fileSizeRange: FileSizeRange,
	messages: ValidateImageFileMessages,
): string | undefined {
	if (!isSupportedImageType(file)) {
		return messages.unsupportedType
	}

	if (file.size < fileSizeRange.min) {
		return messages.tooSmall(formatBytes(fileSizeRange.min))
	}

	if (file.size > fileSizeRange.max) {
		return messages.tooLarge(formatBytes(fileSizeRange.max))
	}
}
