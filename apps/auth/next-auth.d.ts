import type {
  AuthModule,
  BackendUser,
  SessionUser,
} from "@workspace/auth/claims"

declare module "next-auth" {
  interface User {
    backendUser?: BackendUser
    backendToken?: string
    backendTokenExpiresAt?: number
    modules?: AuthModule[]
  }

  interface Session {
    user: SessionUser
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: BackendUser
    backendToken?: string
    backendTokenExpiresAt?: number
    modules?: AuthModule[]
  }
}
