import Elysia, { t } from "elysia"
import { artist, artist_localized_name } from "~/database/schema"
import {
  Artist,
  artist_schema,
  new_artist_schema,
  NewArtist,
} from "~/database/type/typebox"
import { Schema } from "~/lib/schema"
import { db as _db, DB } from "~/service/database"
import { type Model } from ".."

type With = Exclude<
  Parameters<typeof _db.query.artist.findFirst>[0],
  undefined
>["with"]
type UnprocessedArtist = Awaited<ReturnType<typeof simulate_find>>

const simulate_find = () => _db.query.artist.findFirst({ with: result_shape })

const result_shape = {
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
  members: {
    with: {
      member: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  },
  member_of: {
    with: {
      group: {
        columns: {
          id: true,
          name: true,
        },
      },
    },
  },
  release: {
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
} satisfies With

function processArtist<T extends UnprocessedArtist>(
  artist: T,
): undefined extends T ? undefined : Artist {
  // @ts-ignore
  if (!artist) return undefined
  // @ts-ignore
  return {
    ...artist,
    alias_group: undefined,
    aliases:
      artist?.alias_group?.artist.filter(({ id }) => id !== artist?.id) ?? [],
    release: artist.release.map((x) => x.release),
    members: artist.members.map((x) => x.member),
    member_of: artist.member_of.map((x) => x.group),
  }
}

class ArtistModel implements Partial<Model<Artist, NewArtist>> {
  private db: DB
  constructor(db?: DB) {
    this.db = db ?? _db
  }

  async findByID(id: number) {
    return this.db.query.artist
      .findFirst({
        where: (fields, op) => op.eq(fields.id, id),
        with: result_shape,
      })
      .then(processArtist)
  }

  async insert(data: NewArtist) {
    return this.db
      .transaction(async (tx) => {
        let res = (await tx.insert(artist).values(data).returning())[0]

        if (data.localized_name) {
          await tx.insert(artist_localized_name).values(
            data.localized_name.map(({ name, language }) => ({
              name,
              language,
              artist_id: res.id,
            })),
          )
        }

        return res
      })
      .then((res) => this.findByID(res.id)) as Promise<Artist>
  }

  async findByKeyword(keyword: string, limit = 10) {
    return this.db.query.artist
      .findMany({
        where: (fields, op) => op.ilike(fields.name, `%${keyword}%`),
        limit,
        with: result_shape,
      })
      .then((x) => x.map(processArtist))
  }
}

export const artist_model = new Elysia()
  .model({
    "artist::find_by_id": Schema.ok(artist_schema),
    "artist::new": new_artist_schema,
    "artist::find_by_keyword": Schema.ok(t.Array(artist_schema)),
  })
  .decorate("artist", new ArtistModel())
