import { toMd5Base64Url } from "@touhouclouddb/utils"
import { eq } from "drizzle-orm"
import fs from "fs/promises"
import { image_table } from "~/database/schema"
import { type DB, db } from "~/service/database/connection"

export class ImageModel {
  private db: DB

  constructor(_db?: DB) {
    this.db = _db ?? db
  }

  private get image_path() {
    if (process.env.IMAGE_PATH) {
      return process.env.IMAGE_PATH
    } else {
      throw new Error("IMAGE_PATH is not set")
    }
  }

  private async writeFile(name: string, bytes: Uint8Array) {
    const path = `${this.image_path}/${name}`
    if (process.isBun as 0 | 1) await Bun.write(path, bytes)
    else await fs.writeFile(path, bytes)
  }

  private async removeFile(name: string) {
    const path = `${this.image_path}/${name}`
    await fs.unlink(path)
  }

  async upload(
    user_id: number,
    {
      bytes,
      extension_name,
    }: {
      bytes: Uint8Array
      extension_name: string
    },
  ) {
    const image_hash = toMd5Base64Url(bytes)
    const file_name = `${image_hash}.${extension_name}`
    const [img] = await this.db
      .insert(image_table)
      .values({
        filename: file_name,
        uploaded_by: user_id,
      })
      .returning()
    await this.writeFile(file_name, bytes)

    return img!
  }

  async deleteByHash(image_hash: string) {
    const { filename } = (
      await this.db
        .delete(image_table)
        .where(eq(image_table.filename, image_hash))
        .returning({
          filename: image_table.filename,
        })
        .then((x) => {
          if (!x.length) throw new Error("No such image")
          return x
        })
    )[0]!

    await this.removeFile(filename)
  }

  async deleteByID(id: number) {
    const { filename } = (
      await this.db
        .delete(image_table)
        .where(eq(image_table.id, id))
        .returning({
          filename: image_table.filename,
        })
        .then((x) => {
          if (!x.length) throw new Error("No such image")
          return x
        })
    )[0]!

    await this.removeFile(filename)
  }
}
