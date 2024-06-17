"use server"
import { usePrisma } from "~/database/prisma_singleton"

export type ArtistType = "Person" | "Group"

export async function findArtistWithAlias() {
	try {
		const prisma = usePrisma()
		const artist = await prisma.artist.findFirst({
			where: { id: 1 },
			include: { alias: { where: { NOT: { id: 1 } } } },
		})

		return artist
	} catch (e) {
		console.log(e)
	} finally {
		console.log("find artist with alias finished")
	}
}
export async function findArtistMember() {
	try {
		const prisma = usePrisma()
		const artist = await prisma.artist.findFirst({
			where: { id: 4 },
			include: { members: true },
		})
		return artist
	} catch (e) {
		return e
	}
}
export async function addData() {
	try {
		const prisma = usePrisma()
		await prisma.artist.createMany({
			data: [
				{
					id: 1,
					name: "foo",
					alias_id: 1,
					type: "Person",
				},
				{
					id: 2,
					name: "bar",
					alias_id: 1,
					type: "Person",
				},
				{
					id: 3,
					name: "baz",
					alias_id: 1,
					type: "Person",
				},
			],
			skipDuplicates: true,
		})
		await prisma.artist.upsert({
			where: {
				id: 4,
			},
			update: {
				name: "test group",
				type: "Group",
				members: {
					connect: [{ id: 1 }, { id: 2 }, { id: 3 }],
				},
			},
			create: {
				name: "test group",
				type: "Group",
				members: {
					connect: [{ id: 1 }, { id: 2 }, { id: 3 }],
				},
			},
		})
		await prisma.artist.upsert({
			where: {
				id: 5,
			},
			update: {
				name: "test group 2",
				type: "Group",
				members: {
					connect: [{ id: 1 }],
				},
			},
			create: {
				name: "test group 2",
				type: "Group",
				members: {},
			},
		})

		return console.log("success")
	} catch (e) {
		console.log(e)
	}
}
export async function findArtistMemberOf() {
	try {
		const prisma = usePrisma()
		const artist = await prisma.artist.findFirst({
			where: { id: 1 },
			include: { member_of: true },
		})
		return artist
	} catch (e) {
		return e
	}
}
