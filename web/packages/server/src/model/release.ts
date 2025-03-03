import { type AsyncReturnType } from "@touhouclouddb/utils"
import {
  release,
  release_artist,
  release_title_translation,
  release_track,
} from "~/database/release/schema"
import { type NewRelease, type Release } from "~/database/release/typebox"
import { song, song_artist } from "~/database/schema"
import { type DB, db } from "~/service/database/connection"

type With = Required<
  NonNullable<Parameters<typeof db.query.release.findFirst>[0]>
>["with"]

const WITH = {
  artist: {
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
  localized_title: {
    columns: {
      title: true,
      language: true,
    },
  },
} satisfies With

type UnflattenedRelease = AsyncReturnType<typeof simulate_find>

const simulate_find = () => db.query.release.findFirst({ with: WITH })

function flattenRelease<T extends UnflattenedRelease>(
  r: T,
): T extends undefined ? undefined : Release {
  if (!r) return undefined as T extends undefined ? undefined : Release
  return {
    id: r.id,
    artist: r.artist.map(({ artist }) => artist),
  } as T extends undefined ? undefined : Release
}

export class ReleaseModel {
  #db: DB
  constructor() {
    this.#db = db
  }

  async findByID(id: number): Promise<Release | undefined> {
    return this.#db.query.release
      .findFirst({
        where: (fields, op) => op.eq(fields.id, id),
        with: WITH,
      })
      .then(flattenRelease)
  }

  async findByKeyword(keyword: string, limit = 10) {
    return this.#db.query.release
      .findMany({
        where: (fields, op) => op.ilike(fields.title, `%${keyword}%`),
        limit,
        with: WITH,
      })
      .then((x) => x.map(flattenRelease))
  }

  async create(data: NewRelease) {
    const { artist, localized_title, track, ...value } = data
    return this.#db
      .transaction(async (tx) => {
        const new_release = (
          await tx
            .insert(release)
            .values({
              ...value,
            })
            .returning()
        )[0]!

        tx.insert(release_artist).values(
          artist.map((id) => ({ artist_id: id, release_id: new_release.id })),
        )

        if (localized_title && localized_title.length > 0) {
          tx.insert(release_title_translation).values(
            localized_title.map(({ title, language }) => ({
              title,
              language,
              release_id: new_release.id,
            })),
          )
        }

        if (track && track.length > 0) {
          type WithSong = Required<(typeof track)[number]> & {
            release_id: number
          }

          type WithoutSong = (typeof track)[number] & {
            release_id: number
            song_id: undefined
          }

          const [with_song, without_song] = track
            .map((x) => ({ ...x, release_id: new_release.id }))
            .reduce<[WithSong[], WithoutSong[]]>(
              (acc, x) => {
                if (x.song_id) {
                  acc[0].push(x as WithSong)
                } else {
                  acc[1].push(x as unknown as WithoutSong)
                }
                return acc
              },
              [[], []],
            )

          if (without_song.length > 0) {
            const values = without_song.map((x) => {
              if (!x.overwrite_title)
                throw new Error("overwrite_title is required")
              return { title: x.overwrite_title }
            })
            const song_ids = await tx
              .insert(song)
              .values(values)
              .returning({ id: song.id })

            const without_song_with_insert = without_song.map((x, i) => {
              if (!x.overwrite_title)
                throw new Error("overwrite_title is required")
              return {
                ...x,
                song_id: song_ids[i]!.id,
              }
            })

            const insert_song_artist_value = without_song_with_insert.reduce<
              { artist_id: number; song_id: number }[]
            >((acc, x) => {
              if (!x.artist.length)
                return acc.concat({
                  artist_id: new_release.id,
                  song_id: x.song_id,
                })
              return acc.concat(
                x.artist.map((id) => ({
                  artist_id: id,
                  song_id: x.song_id,
                })),
              )
            }, [])
            await db.insert(song_artist).values(insert_song_artist_value)

            with_song.push(...without_song_with_insert)
          }
          with_song.sort((a, b) => a.track_order - b.track_order)
          tx.insert(release_track).values(with_song)
        }

        return new_release.id
      })
      .then((x) => this.findByID(x))
  }
}
