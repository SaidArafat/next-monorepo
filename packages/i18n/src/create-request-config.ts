import type { AbstractIntlMessages } from "next-intl"
import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"

import { loadSharedMessages, mergeMessages } from "./messages"
import { type Locale, routing } from "./routing"

type AppMessagesByLocale = Record<Locale, AbstractIntlMessages>

export function createRequestConfig(
  appMessages: AppMessagesByLocale
) {
  return getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale
    const locale = hasLocale(routing.locales, requested)
      ? requested
      : routing.defaultLocale

    const shared = await loadSharedMessages(locale)

    return {
      locale,
      messages: mergeMessages(shared, appMessages[locale]),
    }
  })
}
