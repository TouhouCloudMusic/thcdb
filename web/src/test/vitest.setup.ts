import { DEFAULT_LOCALE } from "../state/i18n/init"
import { loadLocale } from "../state/i18n/runtime"

await loadLocale(DEFAULT_LOCALE)
