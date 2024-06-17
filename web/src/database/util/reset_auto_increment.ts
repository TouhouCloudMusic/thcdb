/* eslint-disable @typescript-eslint/require-await */
"use server"
import { usePrisma } from "../prisma_singleton"

type Table = "artist" | "release"

export async function resetAutoIncrement(table: Table) {
	"use server"
	const prisma = usePrisma()
	prisma
		.$executeRawUnsafe(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1;`)
		.catch((e) => {
			console.log(e)
		})
	return
}
