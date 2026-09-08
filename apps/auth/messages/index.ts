import { defineAppMessages } from "@workspace/i18n/define-app-messages"

import arAuth from "./ar/auth.json"
import arMetadata from "./ar/metadata.json"
import enAuth from "./en/auth.json"
import enMetadata from "./en/metadata.json"

export const messages = defineAppMessages({
  en: {
    Auth: enAuth,
    Metadata: enMetadata,
  },
  ar: {
    Auth: arAuth,
    Metadata: arMetadata,
  },
})

export type AppMessages = (typeof messages)["en"]
