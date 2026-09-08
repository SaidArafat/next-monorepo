import "server-only"

import { decodeJwt } from "jose"
import { z } from "zod"

export const moduleSchema = z.object({
  code: z.string().min(1),
  permissions: z.array(z.string().min(1)),
})

export const backendUserSchema = z.object({
  id: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  email: z.email(),
  username: z.string().min(1),
  activated: z.boolean(),
  imageUrl: z.url().nullable(),
  name: z.string().min(1),
  shortName: z.string().min(1),
  emailEvara: z.email(),
  emailPrivate: z.email(),
  phone: z.string().nullable(),
})

export const loginResponseSchema = z.object({
  user: backendUserSchema,
  token: z.string().min(1),
})

export const backendTokenClaimsSchema = z.object({
  id: z.number().int().positive(),
  email: z.email(),
  modules: z.array(moduleSchema),
  iat: z.number().int(),
  exp: z.number().int().positive(),
})

export const authTokenSchema = z
  .object({
    sub: z.string().min(1),
    user: backendUserSchema,
    modules: z.array(moduleSchema),
    backendToken: z.string().min(1),
    backendTokenExpiresAt: z.number().int().positive(),
  })
  .passthrough()

export type BackendUser = z.infer<typeof backendUserSchema>
export type AuthModule = z.infer<typeof moduleSchema>
export type AuthToken = z.infer<typeof authTokenSchema>
export type CurrentUser = BackendUser & {
  modules: AuthModule[]
}
export type SessionUser = Pick<
  BackendUser,
  "email" | "username" | "activated" | "imageUrl" | "name" | "shortName"
> & {
  id: string
  backendId: number
  modules: AuthModule[]
}

export function validateLoginResponse(input: unknown) {
  const response = loginResponseSchema.parse(input)
  const claims = backendTokenClaimsSchema.parse(decodeJwt(response.token))
  const now = Math.floor(Date.now() / 1000)

  if (!response.user.activated) {
    throw new Error("User account is inactive")
  }

  if (
    claims.id !== response.user.id ||
    claims.email.toLowerCase() !== response.user.email.toLowerCase()
  ) {
    throw new Error("Login response identity mismatch")
  }

  if (claims.exp <= now) {
    throw new Error("Backend token is expired")
  }

  return {
    user: response.user,
    backendToken: response.token,
    modules: claims.modules,
    backendTokenExpiresAt: claims.exp,
  }
}
