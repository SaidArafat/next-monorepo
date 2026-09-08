import "server-only"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getToken } from "next-auth/jwt"

import { authTokenSchema } from "./claims"
import type { AuthToken, CurrentUser } from "./claims"
import { getSessionCookie } from "./cookie"
import { getAuthEnv } from "./env"
import { createLoginUrl } from "./redirects"

type RequestWithHeaders = Request | { headers: Headers }

async function resolveRequest(
  request?: RequestWithHeaders
): Promise<RequestWithHeaders> {
  if (request) {
    return request
  }

  return { headers: await headers() }
}

export async function getAuthToken(
  request?: RequestWithHeaders
): Promise<AuthToken | null> {
  const env = getAuthEnv()
  const cookie = getSessionCookie()

  try {
    const decoded = await getToken({
      req: await resolveRequest(request),
      secret: env.AUTH_SECRET,
      cookieName: cookie.name,
      salt: cookie.salt,
      secureCookie: cookie.options.secure,
    })
    const parsed = authTokenSchema.safeParse(decoded)

    if (
      !parsed.success ||
      parsed.data.backendTokenExpiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

export async function getCurrentUser(
  request?: RequestWithHeaders
): Promise<CurrentUser | null> {
  const token = await getAuthToken(request)

  if (!token) {
    return null
  }

  return {
    ...token.user,
    modules: token.modules,
  }
}

export async function requireCurrentUser(request?: RequestWithHeaders) {
  const user = await getCurrentUser(request)

  if (!user) {
    if (request instanceof Request) {
      redirect(createLoginUrl(request.url).toString())
    }

    const requestHeaders = await headers()
    const host =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")
    const env = getAuthEnv()
    const protocol =
      requestHeaders.get("x-forwarded-proto") ??
      new URL(env.AUTH_APP_URL).protocol.replace(":", "")
    const forwardedPath =
      requestHeaders.get("x-forwarded-uri") ??
      requestHeaders.get("x-original-url") ??
      "/"
    const fallback = env.defaultReturnUrl
    const returnTo = host
      ? new URL(forwardedPath, `${protocol}://${host}`)
      : new URL(fallback)

    redirect(createLoginUrl(returnTo).toString())
  }

  return user
}

export async function hasModule(
  code: string,
  request?: RequestWithHeaders
) {
  const user = await getCurrentUser(request)
  return user?.modules.some((module) => module.code === code) ?? false
}

export async function hasPermission(
  permission: string,
  request?: RequestWithHeaders
) {
  const user = await getCurrentUser(request)
  return (
    user?.modules.some((module) =>
      module.permissions.includes(permission)
    ) ?? false
  )
}
