# Platform monorepo

This monorepo contains the DMS app, infrastructure service, centralized
authentication service, and shared packages.

## Local development

Add these entries to `/etc/hosts`:

```text
127.0.0.1 auth.platform.test
127.0.0.1 dms.platform.test
127.0.0.1 infrastructure.platform.test
```

Copy each app's `.env.example` to `.env.local`. Generate one secret and use
the exact same value in all three files:

```bash
openssl rand -base64 32
```

Start every app from the repository root:

```bash
pnpm dev
```

Open:

- `http://dms.platform.test:3000`
- `http://infrastructure.platform.test:3001`
- `http://auth.platform.test:3002`

The auth app is the only app that accepts credentials or writes the shared
session cookie. Local HTTP uses `platform.session-token` with
`Domain=platform.test`. Production must use HTTPS, the real parent domain,
and the same secret on every deployment; the cookie is then named
`__Secure-platform.session-token`.

`AUTH_ALLOWED_ORIGINS` is an exact origin allowlist. Include schemes and
ports where applicable, and never add untrusted subdomains because every
listed service shares the authentication trust boundary. Its first origin
is also the safe fallback destination for missing or rejected `returnTo`
values.

## Adding components

To add components to your app, run the following command at the root of your DMS app:

```bash
pnpm dlx shadcn@latest add button -c apps/dms
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```
