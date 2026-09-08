import "server-only"

import { z } from "zod"

const envSchema = z.object({
  APP_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  AUTH_COOKIE_DOMAIN: z.string().min(1),
  AUTH_APP_URL: z.url(),
  AUTH_ALLOWED_ORIGINS: z.string().min(1),
  AUTH_LOGIN_URL: z.url().optional(),
})

export type AuthEnv = Omit<
  z.infer<typeof envSchema>,
  "AUTH_ALLOWED_ORIGINS"
> & {
  allowedOrigins: ReadonlySet<string>
  defaultReturnUrl: string
}

export function getAuthEnv(): AuthEnv {
  const parsed = envSchema.parse({
    APP_URL: process.env.APP_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    AUTH_COOKIE_DOMAIN: process.env.AUTH_COOKIE_DOMAIN,
    AUTH_APP_URL: process.env.AUTH_APP_URL,
    AUTH_ALLOWED_ORIGINS: process.env.AUTH_ALLOWED_ORIGINS,
    AUTH_LOGIN_URL: process.env.AUTH_LOGIN_URL,
  })
  const origins = parsed.AUTH_ALLOWED_ORIGINS.split(",").map((value) => {
    return new URL(value.trim()).origin
  })
  const defaultReturnUrl = origins[0]

  if (!defaultReturnUrl) {
    throw new Error("AUTH_ALLOWED_ORIGINS must contain at least one origin")
  }

  return {
    ...parsed,
    allowedOrigins: new Set(origins),
    defaultReturnUrl,
  }
}

export function getAuthHostEnv() {
  const env = getAuthEnv()

  if (!env.AUTH_LOGIN_URL) {
    throw new Error("AUTH_LOGIN_URL is required by the auth service")
  }

  return {
    ...env,
    AUTH_LOGIN_URL: env.AUTH_LOGIN_URL,
  }
}
