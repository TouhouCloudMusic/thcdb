import { en, Faker } from "@faker-js/faker"

const faker = new Faker({ locale: [en] })

export function createMockNamedReference(id: number) {
	faker.seed(id)

	return { id, name: `${faker.company.name()} ${id}` }
}

export function createMockSongReference(id: number) {
	faker.seed(id)

	return { id, title: `${faker.music.songName()} ${id}` }
}
