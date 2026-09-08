"use server"

import { hasLocale } from "next-intl"
import { AuthError, CredentialsSignin } from "next-auth"

import { getSafeReturnTo } from "@workspace/auth/redirects"
import { redirect } from "@workspace/i18n/navigation"
import { routing } from "@workspace/i18n/routing"

import { signIn, signOut } from "@/auth"

export async function loginAction(formData: FormData) {
  const requestedLocale = String(
    formData.get("locale") ?? routing.defaultLocale
  )
  const locale = hasLocale(routing.locales, requestedLocale)
    ? requestedLocale
    : routing.defaultLocale
  const returnTo = getSafeReturnTo(String(formData.get("returnTo") ?? ""))

  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: returnTo,
    })
  } catch (error) {
    if (error instanceof AuthError) {
      const searchParams = new URLSearchParams()
      searchParams.set(
        "error",
        error instanceof CredentialsSignin
          ? "invalid_credentials"
          : "configuration"
      )
      searchParams.set("returnTo", returnTo)
      redirect({
        href: `/login?${searchParams.toString()}`,
        locale,
      })
    }

    throw error
  }
}

export async function logoutAction(formData: FormData) {
  const returnTo = getSafeReturnTo(String(formData.get("returnTo") ?? ""))
  await signOut({ redirectTo: returnTo })
}
