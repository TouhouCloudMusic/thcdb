import { client } from "../hey-api/client.gen"
import { DEFAULT_LOCALE } from "../state/i18n/init"
import { loadLocale } from "../state/i18n/runtime"

client.setConfig({ baseUrl: new URL("/api", globalThis.location.href).href })

await loadLocale(DEFAULT_LOCALE)
