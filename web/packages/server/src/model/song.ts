import { sql } from "drizzle-orm"
import { song } from "~/database/schema"
import { type NewSong, type Song } from "~/database/song/typebox"
import { type DB, db } from "~/service/database/connection"

export class SongModel {
  private db: DB
  constructor(_db: DB = db) {
    this.db = _db
  }

  async findByID(id: number): Promise<Song | undefined> {
    return await this.db.query.song.findFirst({
      where: (fields, op) => op.eq(fields.id, id),
    })
  }

  async findByKeyword(keyword: string, limit = 10): Promise<Song[]> {
    return await this.db.query.song.findMany({
      where: (fields, op) => op.ilike(fields.title, `%${keyword}%`),
      limit,
    })
  }

  async create(data: NewSong) {
    return (await this.db.insert(song).values(data).returning())[0]!
  }

  async random(count: number): Promise<Song[]> {
    return await this.db
      .select()
      .from(song)
      .orderBy(sql`RANDOM()`)
      .limit(count)
  }
}
