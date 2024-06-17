"use server"
import { usePrisma } from "../prisma_singleton"
const prisma = usePrisma()

export async function findReleaseByID(id: number | bigint) {
	const res = await prisma.release.findUnique({
		where: {
			id: id,
		},
		include: {
			credits: {
				include: {
					artist: true,
					credit_role: true,
				},
			},
			artist: {
				include: {
					artist: true,
				},
			},
			tracklist: {
				include: {
					artist: true,
					song: true,
				},
			},
		},
	})
	return res
}
