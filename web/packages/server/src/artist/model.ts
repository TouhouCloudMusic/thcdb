import type { FindFirstQueryConfig } from "@touhouclouddb/utils/drizzle"
import { eq } from "drizzle-orm"
import Elysia from "elysia"
import { type Artist, type NewArtist } from "~/database/artist/typebox"
import {
  artist,
  localized_name as localized_name_table,
} from "~/database/schema"
import { QueueModel } from "~/model/queue"
import { database_service } from "~/service/database"
import type { db, DB } from "~/service/database/connection"
import { flattenArtist } from "./utils/flatten_artist"

export const RETURN_WITH = {
  alias_group: {
    columns: {},
    with: {
      artist: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  },
  localized_name: {
    columns: {
      language: true,
      name: true,
    },
  },
  to_members: {
    columns: {},
    with: {
      member: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  },
  to_member_of: {
    columns: {},
    with: {
      group: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  },
  to_release_artist: {
    columns: {},
    with: {
      release: {
        columns: {
          id: true,
          title: true,
        },
      },
    },
  },
} satisfies FindFirstQueryConfig<typeof db.query.artist>["with"]

export class ArtistModel {
  constructor(private db: DB) {}

  private _queue_model?: QueueModel
  private get queue_model() {
    return (this._queue_model ??= new QueueModel(this.db))
  }

  async findByID(id: number): Promise<Artist | undefined> {
    return this.db.query.artist
      .findFirst({
        where: (fields, op) => op.eq(fields.id, id),
        with: RETURN_WITH,
      })
      .then(flattenArtist)
  }

  async findByKeyword(keyword: string, limit = 10) {
    return this.db.query.artist
      .findMany({
        where: (fields, op) => op.ilike(fields.name, `%${keyword}%`),
        limit,
        with: RETURN_WITH,
      })
      .then((x) => x.map(flattenArtist))
  }

  async create(data: NewArtist) {
    return this.db
      .transaction(async (tx) => {
        const [res] = await tx.insert(artist).values(data).returning()

        if (data.localized_name) {
          await tx.insert(localized_name_table).values(
            data.localized_name.map(({ name, language }) => ({
              name,
              language,
              artist_id: res!.id,
            })),
          )
        }
        return res!.id
      })
      .then((id) => this.findByID(id))
  }

  async createPullRequest({
    artist_data,
    artist_id,
    author_id,
  }: {
    artist_id: number
    artist_data: NewArtist
    author_id: number
  }) {
    const old_artist_data = await this.findByID(artist_id)
    if (!old_artist_data) {
      throw new Error(`Artist ${artist_id} not found`)
    }
    return this.queue_model.create({
      author: author_id,
      entity_id: artist_id,
      entity_type: "Artist",
      new_data: artist_data,
      old_data: old_artist_data,
    })
  }

  async update(artist_id: number, data: Partial<NewArtist>) {
    const { localized_name, ...artist_data } = data
    return this.db.transaction(async (tx) => {
      await tx
        .update(artist)
        .set(artist_data)
        .where(eq(artist.id, artist_id))
        .returning()

      if (localized_name && localized_name.length > 0) {
        await tx
          .delete(localized_name_table)
          .where(eq(localized_name_table.artist_id, artist_id))
        await tx.insert(localized_name_table).values(
          localized_name.map(({ name, language }) => ({
            name,
            language,
            artist_id,
          })),
        )
      }
    })
  }
}

export const artist_model = new Elysia({
  name: "Model::Artist",
})
  .use(database_service)
  .decorate(({ db }) => ({
    ArtistModel: new ArtistModel(db),
  }))
  .as("plugin")
