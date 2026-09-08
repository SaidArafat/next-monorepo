# Feature inventory and platform notes

## How to read this document

This inventory separates platform foundations from business capabilities.
“Implemented” means code exists and is wired into the current applications.
“Not yet implemented” means the repository may contain a placeholder or
supporting primitive, but not a complete user workflow.

## Implemented platform features

### Monorepo orchestration

- pnpm workspaces discover all apps and packages.
- Turborepo coordinates development, builds, linting, formatting, and
  type-checking.
- Internal dependencies use `workspace:*`.
- Applications consume shared package source through explicit package export
  maps and Next.js `transpilePackages`.
- Node.js 20+ and pnpm 10.33.4 are part of the repository contract.

### Independently runnable applications

- DMS runs on port 3000.
- Infrastructure runs on port 3001.
- Auth runs on port 3002.
- Each app has its own Next.js config, TypeScript config, lint config,
  messages, environment template, and start/build scripts.
- Apps can be built and deployed separately even though they share a
  repository.

### Canonical service hostnames

Local requests model sibling production services:

- `dms.platform.test`
- `infrastructure.platform.test`
- `auth.platform.test`

Direct loopback requests redirect to the matching canonical `APP_URL`.
Next.js development origins are allowlisted per app.

### Required locale routing

[`packages/i18n/src/routing.ts`](../packages/i18n/src/routing.ts) defines:

- Supported locales: English (`en`) and Arabic (`ar`).
- Default locale: English.
- Mandatory locale prefixing: every page URL contains `/en` or `/ar`.
- Locale direction: left-to-right for English and right-to-left for Arabic.

The proxy canonicalizes locale routing before authentication, so login
returns users to an explicitly localized URL.

### Locale-aware navigation

[`packages/i18n/src/navigation.ts`](../packages/i18n/src/navigation.ts)
exports the standard shared navigation surface:

- `Link`
- `redirect`
- `usePathname`
- `useRouter`
- `getPathname`

The shared locale switcher uses these helpers and preserves the current
query string when moving between English and Arabic.

### Translation ownership

Shared and app-owned messages are deliberately separate:

- [`packages/i18n/src/messages.ts`](../packages/i18n/src/messages.ts) owns
  messages used by multiple apps, currently the locale switcher.
- Each app owns its product wording under `apps/<app>/messages/{en,ar}`.
- [`packages/i18n/src/create-request-config.ts`](../packages/i18n/src/create-request-config.ts)
  selects the locale and merges shared and app messages.
- Each app augments `next-intl` types with its own message shape.

This avoids one global translation file becoming the owner of every
product's wording.

### RTL and typography foundations

- The root localized layouts set the HTML `lang` and `dir` attributes.
- Arabic uses Cairo; English uses Inter.
- Geist Mono is available for code-style content.
- Shared global styles provide Tailwind tokens used by all apps.

Arabic layout direction is implemented. Complete component-by-component RTL
quality still requires testing as the product UI grows.

### Shared UI foundations

[`packages/ui`](../packages/ui) currently provides:

- A shared button primitive.
- The locale switcher.
- A theme provider.
- Global Tailwind and design-token styles.
- shadcn component generation configuration.

This is a foundation rather than a complete design system. Product shells,
navigation, forms, data tables, dialogs, and domain components are not yet
present.

### Centralized authentication BFF

The auth application:

- Owns the localized login and logout UI.
- Accepts Credentials login through Auth.js.
- Calls the external backend login API server-side.
- Validates backend user and token claims.
- Rejects inactive, expired, malformed, or mismatched identities.
- Writes and removes one encrypted parent-domain session cookie.
- Uses generic login errors.
- Restricts return destinations to trusted exact origins.

### Shared SSO session

DMS and infrastructure:

- Never accept passwords.
- Never mount Auth.js handlers.
- Read the same encrypted session server-side.
- Redirect anonymous users to the localized auth app.
- Preserve origin, localized path, and query string in `returnTo`.
- Check authentication both in the proxy and protected layout.

Logging out through auth removes the shared cookie for every protected app.

### Server-side entitlement primitives

The shared auth package validates module and permission claims and exports:

- `hasModule`
- `hasPermission`
- `getCurrentUser`
- `requireCurrentUser`
- `getAuthToken`

The helpers exist, but DMS and infrastructure do not yet have business
operations on which to enforce them.

## Current application capabilities

### DMS

Implemented today:

- Independent Next.js application and canonical hostname.
- Protected localized root page.
- English and Arabic messages and metadata.
- Shared locale switcher, button, typography, and theme foundation.

Not implemented today:

- Document upload, storage, indexing, preview, search, or download.
- Folder or taxonomy management.
- Document permissions and sharing.
- Version history, approval, or audit workflows.
- Backend DMS API integration.
- Working page call-to-action.

### Infrastructure

Implemented today:

- Independent Next.js application and canonical hostname.
- Protected localized root page.
- English and Arabic messages and metadata.
- Shared locale switcher, button, typography, and theme foundation.

Not implemented today:

- Infrastructure inventory or resource management.
- Provisioning, deployment, monitoring, or incident workflows.
- Provider integrations.
- Infrastructure backend API integration.
- Working page call-to-action.

### Auth

Implemented today:

- Localized login and logout pages.
- Credentials server action.
- Auth.js API Route Handler.
- External backend login integration.
- Encrypted JWT session creation.
- Safe browser session projection.
- Centralized redirect and logout behavior.

Not implemented today:

- Password reset or account recovery.
- Multi-factor authentication.
- OAuth, OIDC, or social login.
- User registration.
- Session-management UI.
- Refresh-token or revocation integration.
- Login audit UI.

## UI notes

- System light/dark preference is supported by the theme provider.
- The starter-page text that mentions pressing `d` is informational only;
  no keyboard handler is implemented.
- The starter call-to-action buttons are visual only.
- A browser warning about script placement has been observed with the current
  theme integration and should be resolved before calling the shell
  production-ready.
- The shared shadcn generator currently has RTL generation disabled even
  though page direction is set correctly.

## Operational notes

### Local setup

Add the three local hostnames to `/etc/hosts`, copy each app's
`.env.example` to `.env.local`, and give all trusted apps the same
`AUTH_SECRET`.

Run all apps:

```bash
pnpm dev
```

Run selected apps in parallel:

```bash
pnpm --parallel --filter auth --filter dms dev
pnpm --parallel --filter auth --filter infrastructure dev
```

Running two persistent commands on separate lines in one terminal does not
start both immediately; the second waits for the first to exit unless
Turborepo/pnpm parallel execution or separate terminals are used.

### Environment ownership

Common variables:

- `APP_URL`: the current app's canonical origin.
- `AUTH_SECRET`: shared encrypted-session secret.
- `AUTH_COOKIE_DOMAIN`: parent cookie domain.
- `AUTH_APP_URL`: auth-service origin.
- `AUTH_ALLOWED_ORIGINS`: exact trusted redirect origins.

Auth-host variable:

- `AUTH_LOGIN_URL`: backend authentication endpoint.

The current examples include the login URL in each app, although only the
auth service consumes it.

### Development performance

`pnpm dev` starts three independent Next.js/Turbopack processes. Initial
page visits compile routes lazily, so first-request time can be much slower
than server startup. Running only auth plus the service being developed
reduces contention.

The repository currently lives under `Documents`, which may be
iCloud-synchronized on macOS. Next.js has reported a slow-filesystem
warning in this environment; a local non-synchronized development directory
can improve cold compilation.

### Production deployment

Production should:

- Replace `.platform.test` with real HTTPS service origins.
- Use a deployment secret manager.
- Provide the same shared auth secret only to trusted sibling apps.
- Set the production parent cookie domain.
- Route forwarded host/protocol headers through a trusted proxy.
- Build and deploy each app independently.

No deployment manifests, CI workflow, health endpoints, observability
configuration, or environment-promotion process currently exists in the
repository.

## Current technical limitations

- No automated test suite or Turbo `test` task.
- No domain API Route Handlers or server-only backend client.
- No use of module/permission helpers in product operations.
- No backend JWT signature, issuer, or audience verification in the BFF.
- No refresh, revocation, or permission-resynchronization mechanism.
- API paths are excluded from the page proxy and will require explicit
  protection.
- Parent-domain SSO gives every secret-holding sibling service the same
  authentication trust level.
- Shared session size grows with backend user and entitlement data.
- Lint rules are shared, but current lint configuration can reduce rule
  severity rather than failing every violation.

## Recommended roadmap

### Foundation hardening

1. Add automated claim, redirect, cookie, login, expiry, and logout tests.
2. Fix the theme script warning and add an explicit theme control.
3. Add backend JWT cryptographic verification.
4. Add a server-only backend API client.
5. Define authorization enforcement conventions for actions and handlers.

### Product shell

1. Add shared application shell, navigation, account menu, and logout link.
2. Add loading, error, empty, and unauthorized states.
3. Expand shared UI primitives with accessibility and RTL tests.
4. Add observability, health checks, and deployment documentation.

### Domain delivery

1. Implement DMS workflows behind server-side authorization.
2. Implement infrastructure workflows behind server-side authorization.
3. Add audit events and backend-authoritative permission checks.

## Presentation-safe summary

What can be claimed now:

> The platform has independently runnable localized services, centralized
> credential handling, shared encrypted SSO, safe redirects, and reusable
> workspace packages.

What must not be claimed yet:

> DMS and infrastructure business products are complete or production-ready.
