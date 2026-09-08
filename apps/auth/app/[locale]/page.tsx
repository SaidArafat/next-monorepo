import { hasLocale } from "next-intl"
import { redirect as redirectExternal } from "next/navigation"

import { getSafeReturnTo } from "@workspace/auth/redirects"
import { getCurrentUser } from "@workspace/auth/session"
import { redirect } from "@workspace/i18n/navigation"
import { routing } from "@workspace/i18n/routing"

type Props = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ returnTo?: string }>
}

export default async function AuthPage({ params, searchParams }: Props) {
  const [{ locale: requestedLocale }, query, user] = await Promise.all([
    params,
    searchParams,
    getCurrentUser(),
  ])
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale
  const returnTo = getSafeReturnTo(query.returnTo)

  if (user) {
    redirectExternal(returnTo)
  }

  const loginSearchParams = new URLSearchParams({ returnTo })
  redirect({
    href: `/login?${loginSearchParams.toString()}`,
    locale,
  })
}
