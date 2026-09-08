import "server-only"

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import createMiddleware from "next-intl/middleware"

import { routing } from "@workspace/i18n/routing"

import { getAuthEnv } from "./env"
import { createLoginUrl } from "./redirects"
import { getCurrentUser } from "./session"

type AuthProxyOptions = {
  publicPaths?: readonly string[]
}

function isLoopback(hostname: string) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0"
  )
}

function getRequestUrl(request: NextRequest) {
  const env = getAuthEnv()
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    new URL(env.APP_URL).protocol.replace(":", "")

  return new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    `${protocol}://${host}`
  )
}

function getCanonicalRedirect(request: NextRequest) {
  const requestUrl = getRequestUrl(request)

  if (!isLoopback(requestUrl.hostname)) {
    return null
  }

  return NextResponse.redirect(
    new URL(`${requestUrl.pathname}${requestUrl.search}`, getAuthEnv().APP_URL)
  )
}

function withoutLocale(pathname: string) {
  const segments = pathname.split("/")
  const first = segments[1]

  if (
    first &&
    routing.locales.includes(first as (typeof routing.locales)[number])
  ) {
    return `/${segments.slice(2).join("/")}`.replace(/\/$/, "") || "/"
  }

  return pathname
}

function createLocalizedProxyHandler(options?: AuthProxyOptions) {
  const handleI18nRouting = createMiddleware(routing)
  const publicPaths = options?.publicPaths ?? []

  return async function localizedProxy(request: NextRequest) {
    const canonicalRedirect = getCanonicalRedirect(request)

    if (canonicalRedirect) {
      return canonicalRedirect
    }

    const intlResponse = handleI18nRouting(request)

    if (!options || intlResponse.headers.has("location")) {
      return intlResponse
    }

    const pathname = withoutLocale(request.nextUrl.pathname)
    const isPublic = publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    )

    if (!isPublic && !(await getCurrentUser(request))) {
      return NextResponse.redirect(createLoginUrl(getRequestUrl(request)))
    }

    return intlResponse
  }
}

export function createAuthenticatedProxy(options: AuthProxyOptions = {}) {
  return createLocalizedProxyHandler(options)
}

export function createLocalizedProxy() {
  return createLocalizedProxyHandler()
}
