export type FileSizeRange = {
	min: number
	max: number
}

type FileLike = Pick<File, "size" | "type">

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
): string | undefined {
	if (!isSupportedImageType(file)) {
		return "Only PNG/JPEG images are supported."
	}

	if (file.size < fileSizeRange.min) {
		return `File is too small. Minimum is ${formatBytes(fileSizeRange.min)}.`
	}

	if (file.size > fileSizeRange.max) {
		return `File is too large. Maximum is ${formatBytes(fileSizeRange.max)}.`
	}
}
