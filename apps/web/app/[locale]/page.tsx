import { getTranslations } from "next-intl/server"

import { Button } from "@workspace/ui/components/button"
import { LocaleSwitcher } from "@workspace/ui/components/locale-switcher"

export async function generateMetadata() {
  const t = await getTranslations("Metadata")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function Page() {
  const t = await getTranslations("HomePage")

  return (
    <div className="flex min-h-svh p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-4 text-sm leading-loose">
        <LocaleSwitcher />
        <div>
          <h1 className="font-medium">{t("title")}</h1>
          <p>{t("description")}</p>
          <p>{t("hint")}</p>
          <Button className="mt-2">{t("cta")}</Button>
        </div>
        <div className="font-mono text-xs text-muted-foreground">
          {t.rich("themeHint", {
            key: (chunks) => <kbd>{chunks}</kbd>,
          })}
        </div>
      </div>
    </div>
  )
}
