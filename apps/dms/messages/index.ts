import { defineAppMessages } from "@workspace/i18n/define-app-messages"

import arHome from "./ar/home.json"
import arMetadata from "./ar/metadata.json"
import enHome from "./en/home.json"
import enMetadata from "./en/metadata.json"

export const messages = defineAppMessages({
  en: {
    Metadata: enMetadata,
    HomePage: enHome,
  },
  ar: {
    Metadata: arMetadata,
    HomePage: arHome,
  },
})

export type AppMessages = (typeof messages)["en"]
