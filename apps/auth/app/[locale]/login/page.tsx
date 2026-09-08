import { getTranslations } from "next-intl/server"
import { redirect as redirectExternal } from "next/navigation"

import { getSafeReturnTo } from "@workspace/auth/redirects"
import { getCurrentUser } from "@workspace/auth/session"
import { Button } from "@workspace/ui/components/button"
import { LocaleSwitcher } from "@workspace/ui/components/locale-switcher"

import { loginAction } from "../actions"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{
    error?: string
    returnTo?: string
  }>
}

export async function generateMetadata() {
  const t = await getTranslations("Metadata")
  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function LoginPage({ params, searchParams }: Props) {
  const [{ locale }, query, user, t] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
    getTranslations("Auth"),
  ])
  const returnTo = getSafeReturnTo(query.returnTo)

  if (user) {
    redirectExternal(returnTo)
  }

  return (
    <main className="grid min-h-svh place-items-center p-6">
      <section className="border-border bg-card w-full max-w-sm rounded-xl border p-6 shadow-sm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold">{t("loginTitle")}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {t("loginDescription")}
            </p>
          </div>
          <LocaleSwitcher />
        </div>

        {query.error ? (
          <p
            role="alert"
            className="bg-destructive/10 text-destructive mb-4 rounded-md p-3 text-sm"
          >
            {query.error === "invalid_credentials"
              ? t("invalidCredentials")
              : t("configurationError")}
          </p>
        ) : null}

        <form action={loginAction} className="space-y-4">
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="grid gap-1.5 text-sm">
            <span>{t("email")}</span>
            <input
              required
              autoComplete="username"
              name="email"
              type="email"
              className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 outline-none focus-visible:ring-2"
            />
          </label>

          <label className="grid gap-1.5 text-sm">
            <span>{t("password")}</span>
            <input
              required
              autoComplete="current-password"
              name="password"
              type="password"
              className="border-input bg-background focus-visible:ring-ring h-9 rounded-md border px-3 outline-none focus-visible:ring-2"
            />
          </label>

          <Button className="w-full" type="submit">
            {t("signIn")}
          </Button>
        </form>
      </section>
    </main>
  )
}
