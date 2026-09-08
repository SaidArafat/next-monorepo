import { type AbstractIntlMessages } from "next-intl"

import { type Locale } from "./routing"

type AppMessagesByLocale = Record<Locale, AbstractIntlMessages>

export function defineAppMessages<const Messages extends AppMessagesByLocale>(
  messages: Messages
) {
  return messages
}
