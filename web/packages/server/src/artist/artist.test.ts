import { describe, expect, test } from "bun:test"
import { test_db } from "~/test/singletons"
import { ArtistModel } from "./model"

const TEST_ARTIST_NAME = "foo"
const TEST_TEXT_ALIASES = ["bar", "baz"]
const TEST_ARTIST = {
  name: TEST_ARTIST_NAME,
  text_alias: TEST_TEXT_ALIASES,
  artist_type: "Person",
} as const

describe("artist model", () => {
  const model = new ArtistModel(test_db)

  describe("", () => {
    test("create", async () => {
      const artist = await model.create(TEST_ARTIST)

      expect(artist?.id).toBe(1)
    })
  })

  describe("find", () => {
    test("by id", async () => {
      const artist = await model.findByID(1)

      expect(artist?.name).toBe(TEST_ARTIST_NAME)
      expect(artist?.text_alias).toEqual(TEST_TEXT_ALIASES)
    })

    test("by keyword", async () => {
      const artists = await model.findByKeyword(TEST_ARTIST_NAME)
      const artist = artists[0]!

      expect(artist.name).toBe(TEST_ARTIST_NAME)
      expect(artist.text_alias).toEqual(TEST_TEXT_ALIASES)
    })
  })

  describe("", () => {
    test("update", async () => {
      await model.update(1, {
        name: "fool",
      })

      const artist = await model.findByID(1)

      expect(artist?.name).toBe("fool")
    })
  })
})
