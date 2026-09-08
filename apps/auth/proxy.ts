import { createLocalizedProxy } from "@workspace/auth/proxy"

export default createLocalizedProxy()

export const config = {
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
}
