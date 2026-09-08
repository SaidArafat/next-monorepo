import { createAuthenticatedProxy } from "@workspace/auth/proxy"

export default createAuthenticatedProxy()

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
}
