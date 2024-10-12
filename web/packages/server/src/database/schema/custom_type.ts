import { customType } from "drizzle-orm/pg-core"

/**
 * - country: varchar
 * - subdivision: varchar
 * - city: varchar
 */
export const location = customType<{
  data: {
    country: string | undefined
    subdivision: string | undefined
    city: string | undefined
  }
  driverData: string
}>({
  dataType() {
    return "location_tuple"
  },
  toDriver(value) {
    return `('${value.country}','${value.subdivision}','${value.city}')`
  },
  fromDriver(value) {
    const match = /\((?<country>.+),\s?(?<province>.+),\s?(?<city>.+)\)/.exec(
      value as string,
    )
    if (!match) {
      throw new Error("Invalid location")
    }
    return {
      country: match.groups?.country,
      subdivision: match.groups?.province,
      city: match.groups?.city,
    }
  },
})

// export const localized_name = customType<{
// 	data: {
// 		language: LocalizationLanguage
// 		name: string
// 	}
// 	driverData: string
// }>({
// 	dataType() {
// 		return "localized_name"
// 	},
// 	toDriver(value) {
// 		return `('${value.language}', '${value.name}')`
// 	},
// 	fromDriver(value) {
// 		const match = /\((?<language>.+),\s?(?<name>.+)\)/.exec(value as string)
// 		if (!match) {
// 			throw new Error("Invalid localized_name")
// 		}
// 		return {
// 			language: match.groups?.language! as LocalizationLanguage,
// 			name: match.groups?.name!,
// 		}
// 	},
// })
