import { hash } from "@touhouclouddb/utils"
import { describe, expect, test } from "bun:test"
import { test_db } from "~/test/singletons"
import { UserModel } from "../model/user"

const TEST_USERNAME = "foo"
const TEST_PASSWORD = "12345678"

describe("user model", () => {
  const model = new UserModel(test_db)

  describe("", () => {
    test("create user", async () => {
      const user = await model.create({
        name: TEST_USERNAME,
        password: await hash(TEST_PASSWORD),
      })

      expect(user.id).toBe(1)
    })

    test("check existence", async () => {
      const res = await model.exist(TEST_USERNAME)

      expect(res).toBe(true)
    })
  })

  describe("find first", () => {
    test("by id", async () => {
      const user = await model.findById(1)

      expect(user?.name).toBe(TEST_USERNAME)
    })

    test("by name", async () => {
      const user = await model.findByName(TEST_USERNAME)

      expect(user?.name).toBe(TEST_USERNAME)
    })
  })

  describe("check role", () => {
    test("any of", async () => {
      const res = await model.checkRole(1, "any of", ["User", "Admin"])

      expect(res).toBe(true)
    })

    test("all of", async () => {
      const res = await model.checkRole(1, "all of", ["User", "Admin"])

      expect(res).toBe(false)
    })
  })
})
