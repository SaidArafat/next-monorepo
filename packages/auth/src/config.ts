import "server-only"

import type { NextAuthConfig } from "next-auth"

import { getSessionCookie } from "./cookie"
import { getAuthEnv } from "./env"

export function getSharedAuthConfig() {
  const env = getAuthEnv()
  const sessionCookie = getSessionCookie()

  return {
    secret: env.AUTH_SECRET,
    trustHost: true,
    session: {
      strategy: "jwt",
      maxAge: 7 * 24 * 60 * 60,
    },
    cookies: {
      sessionToken: {
        name: sessionCookie.name,
        options: sessionCookie.options,
      },
    },
  } satisfies Partial<NextAuthConfig>
}
