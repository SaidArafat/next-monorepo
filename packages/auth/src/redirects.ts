import "server-only"

import { routing } from "@workspace/i18n/routing"

import { getAuthEnv } from "./env"

function localePrefix(pathname: string) {
  const segment = pathname.split("/")[1]

  if (
    segment &&
    routing.locales.includes(segment as (typeof routing.locales)[number])
  ) {
    return `/${segment}`
  }

  return ""
}

export function getSafeReturnTo(value?: string | null) {
  const env = getAuthEnv()

  if (!value) {
    return env.defaultReturnUrl
  }

  try {
    const url = new URL(value)
    return env.allowedOrigins.has(url.origin)
      ? url.toString()
      : env.defaultReturnUrl
  } catch {
    return env.defaultReturnUrl
  }
}

export function createLoginUrl(returnTo: string | URL) {
  const env = getAuthEnv()
  const target = new URL(returnTo)
  const loginUrl = new URL(
    `${localePrefix(target.pathname)}/login`,
    env.AUTH_APP_URL
  )

  loginUrl.searchParams.set("returnTo", getSafeReturnTo(target.toString()))
  return loginUrl
}

export function createLogoutUrl(returnTo?: string | URL) {
  const env = getAuthEnv()
  const safeReturnTo = getSafeReturnTo(returnTo?.toString())
  const target = new URL(safeReturnTo)
  const logoutUrl = new URL(
    `${localePrefix(target.pathname)}/logout`,
    env.AUTH_APP_URL
  )

  logoutUrl.searchParams.set("returnTo", safeReturnTo)
  return logoutUrl
}
