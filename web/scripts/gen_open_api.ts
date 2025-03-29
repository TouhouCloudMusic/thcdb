/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import fs from "fs/promises"
import openApiGen, { astToString } from "openapi-typescript"
import * as ts from "typescript"
import { CONFIG } from "~/config"

const UNDEF = ts.factory.createTypeReferenceNode(
  ts.factory.createIdentifier("undefined"),
)
const BLOB = ts.factory.createTypeReferenceNode(
  ts.factory.createIdentifier("Blob"),
)
const NULL = ts.factory.createLiteralTypeNode(ts.factory.createNull())

let api_doc_url = new URL("openapi.json", CONFIG.server_base_url)

// Make sure server is running
let json = (await fetch(api_doc_url).then((res) => res.json())) as string

let ast = await openApiGen(json, {
  exportType: true,
  transform(schemaObject, metadata) {
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

interface OpenApiSchema {
  components?: {
    schemas?: Record<string, unknown>
    responses?: Record<string, unknown>
    parameters?: Record<string, unknown>
    examples?: Record<string, unknown>
    requestBodies?: Record<string, unknown>
    headers?: Record<string, unknown>
    securitySchemes?: Record<string, unknown>
    links?: Record<string, unknown>
    callbacks?: Record<string, unknown>
  }
  [key: string]: unknown
}

function findComponent(openApiSchema: OpenApiSchema, ref: string) {
  if (!ref.startsWith("#")) {
    throw new Error(`外部引用(${ref})解析暂不支持，仅支持本地引用(#/...)`)
  }

  const pathSegments = ref.substring(2).split("/")

  if (pathSegments[0] !== "components") {
    throw new Error(`无效的引用路径(${ref})，必须以 '#/components/' 开头`)
  }

  const componentType = pathSegments[1]
  if (!componentType) {
    throw new Error(`无效的组件类型(${ref})`)
  }

  const componentName = pathSegments[2]
  if (!componentName) {
    throw new Error(`无效的组件名称(${ref})`)
  }

  if (
    !openApiSchema.components?.[
      componentType as keyof typeof openApiSchema.components
    ]?.[componentName]
  ) {
    return undefined
  }

  return openApiSchema.components[
    componentType as keyof typeof openApiSchema.components
  ]?.[componentName]
}

let schema = astToString(ast)

await fs.writeFile("./src/query/openapi.ts", schema, "utf8")
