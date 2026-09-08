import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

const nextConfig: NextConfig = {
  allowedDevOrigins: ["dms.platform.test"],
  transpilePackages: [
    "@workspace/auth",
    "@workspace/ui",
    "@workspace/i18n",
  ],
}

const withNextIntl = createNextIntlPlugin("./i18n/request.ts")

export default withNextIntl(nextConfig)
