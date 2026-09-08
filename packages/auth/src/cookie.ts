import "server-only"

import { getAuthEnv } from "./env"

export function getSessionCookie() {
  const env = getAuthEnv()
  const secure = new URL(env.AUTH_APP_URL).protocol === "https:"
  const name = secure
    ? "__Secure-platform.session-token"
    : "platform.session-token"

  return {
    name,
    salt: name,
    options: {
      domain: env.AUTH_COOKIE_DOMAIN,
      httpOnly: true,
      path: "/",
      sameSite: "lax" as const,
      secure,
    },
  }
}
