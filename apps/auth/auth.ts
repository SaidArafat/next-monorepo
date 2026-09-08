import NextAuth, {
  CredentialsSignin,
  type NextAuthConfig,
  type NextAuthResult,
} from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"

import { validateLoginResponse } from "@workspace/auth/claims"
import { getSharedAuthConfig } from "@workspace/auth/config"
import { getAuthEnv, getAuthHostEnv } from "@workspace/auth/env"
import { getSafeReturnTo } from "@workspace/auth/redirects"

class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials"
}

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

const config = {
  ...getSharedAuthConfig(),
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials)

        if (!parsed.success) {
          throw new InvalidCredentialsError()
        }

        const response = await fetch(getAuthHostEnv().AUTH_LOGIN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(parsed.data),
          cache: "no-store",
        })

        if (!response.ok) {
          throw new InvalidCredentialsError()
        }

        try {
          const login = validateLoginResponse(await response.json())

          return {
            id: String(login.user.id),
            email: login.user.email,
            name: login.user.name,
            image: login.user.imageUrl,
            backendUser: login.user,
            backendToken: login.backendToken,
            backendTokenExpiresAt: login.backendTokenExpiresAt,
            modules: login.modules,
          }
        } catch {
          throw new InvalidCredentialsError()
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (
        user?.id &&
        user.backendUser &&
        user.backendToken &&
        user.backendTokenExpiresAt &&
        user.modules
      ) {
        token.sub = user.id
        token.user = user.backendUser
        token.backendToken = user.backendToken
        token.backendTokenExpiresAt = user.backendTokenExpiresAt
        token.modules = user.modules
      }

      return token
    },
    async session({ session, token }) {
      if (token.user && token.modules) {
        session.user = {
          id: String(token.user.id),
          backendId: token.user.id,
          email: token.user.email,
          username: token.user.username,
          activated: token.user.activated,
          imageUrl: token.user.imageUrl,
          name: token.user.name,
          shortName: token.user.shortName,
          modules: token.modules,
        } as typeof session.user
      }

      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        return new URL(url, baseUrl).toString()
      }

      const env = getAuthEnv()
      const parsed = new URL(url)
      return env.allowedOrigins.has(parsed.origin)
        ? parsed.toString()
        : getSafeReturnTo()
    },
  },
} satisfies NextAuthConfig

const nextAuth = NextAuth(config)

export const handlers: NextAuthResult["handlers"] = nextAuth.handlers
export const auth: NextAuthResult["auth"] = nextAuth.auth
export const signIn: NextAuthResult["signIn"] = nextAuth.signIn
export const signOut: NextAuthResult["signOut"] = nextAuth.signOut
