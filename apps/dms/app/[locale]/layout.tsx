import { Cairo, Geist_Mono, Inter } from "next/font/google"
import { hasLocale, NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { notFound } from "next/navigation"

import "@workspace/ui/globals.css"

import { requireCurrentUser } from "@workspace/auth/session"
import { localeDirections, routing } from "@workspace/i18n/routing"
import { ThemeProvider } from "@workspace/ui/components/theme-provider"
import { cn } from "@workspace/ui/lib/utils"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" })

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  variable: "--font-arabic",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

type Props = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)
  await requireCurrentUser()
  const messages = await getMessages({ locale })
  const dir = localeDirections[locale]

  return (
    <html
      lang={locale}
      dir={dir}
      suppressHydrationWarning
      className={cn(
        "font-sans antialiased",
        inter.variable,
        cairo.variable,
        fontMono.variable
      )}
    >
      <body>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <ThemeProvider>{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
