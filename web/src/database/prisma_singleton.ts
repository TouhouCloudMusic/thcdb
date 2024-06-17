"use server"
import { PrismaClient } from "@prisma/client"

function prismaSigleton() {
	return new PrismaClient({
		datasourceUrl: import.meta.env.VITE_DATABASE_URL,
		log: ["query", "info", "warn", "error"],
	})
}

declare const globalThis: {
	prismaGlobal?: ReturnType<typeof prismaSigleton>
} & typeof global

const prisma = globalThis.prismaGlobal ?? prismaSigleton()

export function usePrisma() {
	return prisma
}

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma
