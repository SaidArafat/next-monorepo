import { getTranslations } from "next-intl/server"
import { redirect as redirectExternal } from "next/navigation"

import { getSafeReturnTo } from "@workspace/auth/redirects"
import { getCurrentUser } from "@workspace/auth/session"
import { Button } from "@workspace/ui/components/button"

import { logoutAction } from "../actions"

type Props = {
  searchParams: Promise<{ returnTo?: string }>
}

export default async function LogoutPage({ searchParams }: Props) {
  const [query, user, t] = await Promise.all([
    searchParams,
    getCurrentUser(),
    getTranslations("Auth"),
  ])
  const returnTo = getSafeReturnTo(query.returnTo)

  if (!user) {
    redirectExternal(returnTo)
  }

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="border-border bg-card w-full max-w-sm rounded-xl border p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold">{t("logoutTitle")}</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t("logoutDescription")}
        </p>

        <form action={logoutAction} className="mt-6 grid gap-2">
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit">{t("signOut")}</Button>
          <Button asChild variant="outline">
            <a href={returnTo}>{t("cancel")}</a>
          </Button>
        </form>
      </section>
    </main>
  )
}
