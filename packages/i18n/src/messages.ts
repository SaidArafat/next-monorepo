import { type Locale } from "./routing"

import arLocaleSwitch from "./messages/ar/locale-switch.json"
import enLocaleSwitch from "./messages/en/locale-switch.json"

const sharedMessages = {
  en: { LocaleSwitch: enLocaleSwitch },
  ar: { LocaleSwitch: arLocaleSwitch },
} as const satisfies Record<Locale, { LocaleSwitch: typeof enLocaleSwitch }>

export type SharedMessages = (typeof sharedMessages)["en"]

export async function loadSharedMessages(locale: Locale) {
  return sharedMessages[locale]
}

export function mergeMessages<
  Shared extends Record<string, unknown>,
  App extends Record<string, unknown>,
>(shared: Shared, app: App) {
  return { ...shared, ...app }
}
