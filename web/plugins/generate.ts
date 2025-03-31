/* eslint-disable @typescript-eslint/no-unused-vars */
import fs from "fs/promises"
import openApiGen, { astToString } from "openapi-typescript"
import ts from "typescript"
import { Plugin } from "vite"

export const generatePlugin = (base_url?: string): Plugin => ({
  name: "generate",
  async buildStart() {
    if (!base_url) {
      console.log(
        "SERVER_BASE_URL is not defined, skipping constants generation",
      )
      return
    }
    try {
      await Promise.all([
        generateConstants(base_url),
        generateOpenApi(base_url),
      ])
      console.log("File generated successfully")
    } catch (error) {
      console.error("Failed to generate file:", error)
    }
  },
})

async function generateConstants(base_url: string) {
  const response = await fetch(`${base_url}/constant.ts`)
  const content = await response.text()

  return fs.writeFile("src/constant/server.ts", content)
}

export async function generateOpenApi(base_url: string) {
  const UNDEF = ts.factory.createTypeReferenceNode(
    ts.factory.createIdentifier("undefined"),
  )
  const BLOB = ts.factory.createTypeReferenceNode(
    ts.factory.createIdentifier("Blob"),
  )
  const NULL = ts.factory.createLiteralTypeNode(ts.factory.createNull())

  let api_doc_url = new URL("openapi.json", base_url)

  // Make sure server is running
  let json = (await fetch(api_doc_url).then((res) => res.json())) as string

  let ast = await openApiGen(json, {
    exportType: true,
    transform(schemaObject, _metadata) {
      let types: ts.TypeNode[] = []

      if (
        schemaObject.oneOf?.includes({
          type: "null",
        }) ||
        schemaObject.nullable
      ) {
        types.push(...[UNDEF, NULL])
      }

      if (schemaObject.format === "binary") {
        types.push(BLOB)
      }

      switch (types.length) {
        case 0:
          return undefined
        case 1:
          return types[0]
        default:
          return ts.factory.createUnionTypeNode(types)
      }
    },
  })

  let schema = astToString(ast)

  await fs.writeFile("./src/data/openapi.ts", schema, "utf8")
}
