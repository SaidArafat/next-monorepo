import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["auth.platform.test"],
  transpilePackages: [
    "@workspace/auth",
    "@workspace/i18n",
    "@workspace/ui",
  ],
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
