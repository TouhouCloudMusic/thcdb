import { Either } from "effect"
import sharp from "sharp"

export const AVATAR_EXTENSION_NAME = "jpeg"

const AVATAR_MIN_SIZE = 10 * 1024 // 10kb
const AVATAR_MAX_SIZE = 2 * 1024 * 1024 // 2mb
const AVATAR_MAX_WIDTH = 512
const AVATAR_MAX_HEIGHT = AVATAR_MAX_WIDTH
const VALID_AVATAR_TYPES = ["image/png", "image/jpeg"]

export async function validateAvatar(avatar: File) {
  if (avatar.size > AVATAR_MAX_SIZE) {
    return Either.left("Image too large" as const)
  }

  if (avatar.size < AVATAR_MIN_SIZE) {
    return Either.left("Image too small" as const)
  }

  if (!VALID_AVATAR_TYPES.includes(avatar.type)) {
    return Either.left("Invalid image type" as const)
  }

  const image = sharp(await avatar.arrayBuffer())

  const metadata = await image.metadata()

  const width = metadata.width
  const height = metadata.height

  if (
    !width ||
    !height ||
    width > AVATAR_MAX_WIDTH ||
    height > AVATAR_MAX_HEIGHT
  ) {
    return Either.left("Image too large" as const)
  }

  const aspect_ratio = width / height

  if (!(Math.abs(aspect_ratio - 1) < 0.01)) {
    return Either.left("Image not square" as const)
  }

  return Either.right(await image.toFormat(AVATAR_EXTENSION_NAME).toBuffer())
}
