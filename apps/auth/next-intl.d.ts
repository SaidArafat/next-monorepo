import type { SharedMessages } from "@workspace/i18n/messages"
import type { routing } from "@workspace/i18n/routing"

import type { AppMessages } from "./messages"

declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number]
    Messages: SharedMessages & AppMessages
  }
}
