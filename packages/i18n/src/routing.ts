import { defineRouting } from "next-intl/routing"

export const locales = ["en", "ar"] as const

export type Locale = (typeof locales)[number]

export const localeNames = {
  en: "English",
  ar: "العربية",
} as const satisfies Record<Locale, string>

export const localeDirections = {
  en: "ltr",
  ar: "rtl",
} as const satisfies Record<Locale, "ltr" | "rtl">

export function isRtl(locale: string): boolean {
  return locale === "ar"
}

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "as-needed",
})
