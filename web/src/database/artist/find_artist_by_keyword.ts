"use server"
import { taskEither } from "fp-ts"
import { pipe } from "fp-ts/lib/function"
import { NotFoundError } from "~/lib/error/errors"
import { usePrisma } from "../prisma_singleton"
import { ArtistType } from "./artist_model"
const prisma = usePrisma()

export type ArtistDataByKeyword = Awaited<ReturnType<typeof find>>
const find = async (keyword: string, type?: ArtistType) => {
	const res = await prisma.artist.findMany({
		where: {
			name: {
				contains: keyword,
			},
			type: type,
		},
		select: {
			id: true,
			name: true,
			type: true,
		},
	})
	return res
}

export async function findArtistByKeyword(keyword: string, type?: ArtistType) {
	return await pipe(
		taskEither.tryCatch(
			() => find(keyword, type),
			(e) => {
				if (e instanceof Error) return e
				if (typeof e === "string") return new Error(e)
				else return new Error("unknown error")
			}
		)
	)()
}
