#!/usr/bin/env -S node --disable-warning=ExperimentalWarning --experimental-transform-types

import * as NodeContext from "@effect/platform-node/NodeContext"
import * as NodeRuntime from "@effect/platform-node/NodeRuntime"
import * as Command from "@effect/platform/Command"
import * as FileSystem from "@effect/platform/FileSystem"
import * as Path from "@effect/platform/Path"
import { Effect } from "effect"
import { pipe } from "effect/Function"
import openapiTS, { astToString } from "openapi-typescript"
import { generate as generateOrval } from "orval"

import { api as orvalProjectConfig } from "../orval.config.js"

const SCHEMA_PATH = "./tmp/openapi.json"
const OPENAPI_OUTPUT = "./packages/api/src/gen.ts"
const ORVAL_SENTINEL_OUTPUT = "./src/orval/touhouCloudDB.schemas.ts"
const SERVER_WORKDIR = "../server"

type ServerSchemaSource = {
	readonly _tag: "server"
}

type HttpSchemaSource = {
	readonly _tag: "http"
	readonly url: string
}

type FileSchemaSource = {
	readonly _tag: "file"
	readonly path: string
}

type SchemaSource = ServerSchemaSource | HttpSchemaSource | FileSchemaSource

const SchemaSource = {
	server(): ServerSchemaSource {
		return { _tag: "server" }
	},
	http(url: string): HttpSchemaSource {
		return { _tag: "http", url }
	},
	file(path: string): FileSchemaSource {
		return { _tag: "file", path }
	},
}

function resolveSchemaSource(schemaArg: string): SchemaSource {
	if (schemaArg) {
		if (isHttpUrl(schemaArg)) {
			return SchemaSource.http(schemaArg)
		}
		return SchemaSource.file(schemaArg)
	}

	const apiSchema = process.env["API_SCHEMA"]
	if (apiSchema) {
		if (isHttpUrl(apiSchema)) {
			return SchemaSource.http(apiSchema)
		}
		return SchemaSource.file(apiSchema)
	}

	const serverUrl = process.env["VITE_SERVER_URL"]
	if (serverUrl) {
		return SchemaSource.http(`${serverUrl.replace(/\/+$/u, "")}/openapi.json`)
	}

	return SchemaSource.server()
}

function prepareSchema(
	schemaSource: SchemaSource,
	fs: FileSystem.FileSystem,
	path: Path.Path,
) {
	switch (schemaSource._tag) {
		case "server": {
			return runServerOpenapi()
		}
		case "http": {
			return downloadSchema(schemaSource.url, fs)
		}
		case "file": {
			return copySchemaFile(schemaSource.path, fs, path)
		}
	}
}

function isHttpUrl(value: string) {
	return value.startsWith("http://") || value.startsWith("https://")
}

function copySchemaFile(
	sourcePath: string,
	fs: FileSystem.FileSystem,
	path: Path.Path,
) {
	const fromPath = path.resolve(sourcePath)
	const toPath = path.resolve(SCHEMA_PATH)

	if (fromPath === toPath) {
		return fs.access(toPath, { readable: true })
	}

	return fs.copy(fromPath, toPath)
}

function downloadSchema(schemaUrl: string, fs: FileSystem.FileSystem) {
	return pipe(
		Effect.tryPromise({
			try: async () => {
				const response = await fetch(schemaUrl)
				if (!response.ok) {
					throw new Error(
						`Failed to download OpenAPI schema: ${response.status} ${response.statusText}`,
					)
				}

				return response.text()
			},
			catch: toError,
		}),
		Effect.flatMap((schema) => fs.writeFileString(SCHEMA_PATH, schema)),
	)
}

function runServerOpenapi() {
	return pipe(
		Command.make("cargo", "run", "--", "--openapi", "../web/tmp/openapi.json"),
		Command.workingDirectory(SERVER_WORKDIR),
		Command.stdout("inherit"),
		Command.stderr("inherit"),
		Command.exitCode,
		Effect.flatMap((exitCode) => {
			if (Number(exitCode) === 0) {
				return Effect.void
			}

			return Effect.fail(
				new Error(
					`Failed to generate OpenAPI schema from server (code=${exitCode})`,
				),
			)
		}),
	)
}

function generateOpenapiTypes(fs: FileSystem.FileSystem) {
	return pipe(
		fs.readFileString(SCHEMA_PATH),
		Effect.flatMap((schema) =>
			Effect.tryPromise({
				try: () =>
					openapiTS(schema, {
						alphabetize: true,
						arrayLength: true,
						exportType: true,
						makePathsEnum: true,
						rootTypes: true,
						rootTypesNoSchemaPrefix: true,
					}),
				catch: toError,
			}),
		),
		Effect.map(astToString),
		Effect.flatMap((contents) => fs.writeFileString(OPENAPI_OUTPUT, contents)),
	)
}

function generateOrvalOutput() {
	return Effect.tryPromise({
		try: () => generateOrval(orvalProjectConfig),
		catch: toError,
	})
}

function toError(cause: unknown) {
	return cause instanceof Error ? cause : new Error(String(cause))
}

const program = pipe(
	Effect.gen(function* () {
		const fs = yield* FileSystem.FileSystem
		const path = yield* Path.Path

		yield* fs.makeDirectory("./tmp", { recursive: true })

		const schemaSource = resolveSchemaSource(process.argv[2] ?? "")
		yield* prepareSchema(schemaSource, fs, path)
		yield* generateOpenapiTypes(fs)
		yield* generateOrvalOutput()
		yield* fs.access(path.resolve(ORVAL_SENTINEL_OUTPUT), { readable: true })
	}),
	Effect.provide(NodeContext.layer),
)

NodeRuntime.runMain(program)
