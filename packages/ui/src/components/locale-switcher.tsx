"use client"

import { useLocale, useTranslations } from "next-intl"

import { usePathname, useRouter } from "@workspace/i18n/navigation"
import { localeNames, routing } from "@workspace/i18n/routing"

import { Button } from "@workspace/ui/components/button"

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitch")
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">{t("label")}</span>
      <div className="flex gap-1">
        {routing.locales.map((nextLocale) => (
          <Button
            key={nextLocale}
            type="button"
            size="xs"
            variant={nextLocale === locale ? "default" : "outline"}
            onClick={() => router.replace(pathname, { locale: nextLocale })}
          >
            {localeNames[nextLocale]}
          </Button>
        ))}
      </div>
    </div>
  )
}
