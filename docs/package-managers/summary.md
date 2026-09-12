# Package managers — easy summary

How this repo installs, shares, and runs packages.
Full lessons: [course roadmap](course-roadmap.md).

This repo uses **pnpm** and **Turborepo**. Do not run `npm` or `yarn` here.

---

## 1. npm, Yarn, and pnpm

All three read `package.json`, fetch from a registry, write a lockfile,
and create `node_modules`. They install differently.

- **npm** — ships with Node. `package-lock.json`. Hoists freely, so an
  undeclared import can accidentally work.
- **Yarn** — `yarn.lock`. Classic hoists like npm. Berry is closer to pnpm.
- **pnpm** — this repo (`packageManager: pnpm@10.33.4`). Content-addressable
  store + **strict** `node_modules`: import only what you declared.

One manager per repo. `npm install` here can create a stray
`package-lock.json`.

---

## 2. What a monorepo is here

Several projects in one git repo. Not one deployed app.

```text
apps/dms  apps/auth  apps/infrastructure
packages/ui  packages/i18n  packages/auth
packages/eslint-config  packages/typescript-config
```

[`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) discovers `apps/*` and
`packages/*`. One `pnpm-lock.yaml` at the root. Apps are separate Next.js
apps. Shared code lives in `packages/*`.

---

## 3. How packages are shared

DMS declares `"@workspace/ui": "workspace:*"`. pnpm **symlinks**
`packages/ui` into `apps/dms/node_modules/@workspace/ui`. Auth and
infrastructure do the same. Change the package once; every consumer sees it.

`workspace:*` and `workspace:^` are both internal links, not registry
downloads. Keep internal deps one-way (no `ui` → `i18n` → `ui`).

---

## 4. Root `node_modules` vs each app

Root [`package.json`](../../package.json) is **repo tooling** (`turbo`,
`prettier`, `typescript`). It is not a dump of app runtime deps.

- **Root `node_modules`** is the install root (`.pnpm` lives here). Apps
  cannot import from it just because a package exists.
- **Each app/package `node_modules`** has only **declared** deps.

| You put the package…            | Result                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Only in the **root**            | Root scripts work. Apps get "module not found". npm hoisting would hide this. |
| In **each app** that imports it | Correct. Each app gets a symlink. Same version = one store copy.              |
| In a **shared package**         | Apps import the workspace package. That package owns its own deps.            |

The **pnpm store** (often `~/Library/pnpm/store` on macOS) holds one real
copy of each version. Workspace `node_modules` folders are mostly
**symlinks**. Three apps can depend on React without three copies.

---

## 5. Direct, transitive, phantom, peer

- **Direct** — listed in that package’s `package.json`. If DMS imports
  `next`, `next` must be in `apps/dms/package.json`.
- **Transitive** — a dependency of a dependency. Do not import `clsx`
  just because `@workspace/ui` uses it.
- **Phantom** — undeclared import that works under npm hoist. pnpm fails
  on purpose.
- **Peer** — the consumer must provide it.
  [`packages/i18n`](../../packages/i18n/package.json) peers `next: ">=16"`.

`dependencies` vs `devDependencies`: runtime vs tools. Both are direct.

---

## 6. Example: `zod` + `server-only` + `@workspace/auth`

[`packages/auth`](../../packages/auth/package.json) already has both:

```json
"server-only": "^0.0.1",
"zod": "^4.4.3"
```

[`apps/dms`](../../apps/dms/package.json) has `@workspace/auth` but **not**
`zod` or `server-only`. That is correct **today**: DMS imports
`@workspace/auth/session`, not `zod` or `server-only` in its own files.

### Today — package owns `zod` and `server-only`

```text
store
  zod@4.4.3
  server-only@0.0.1

packages/auth/node_modules
  zod          → store
  server-only  → store

apps/dms/node_modules
  @workspace/auth → ../../packages/auth
```

DMS can use the shared package. It cannot `import { z } from "zod"` or
`import "server-only"` unless it declares them. Those deps live in the
**package’s** `node_modules`, not the app’s.

### If DMS also imports them

```ts
import "server-only"
import { z } from "zod"
import { getCurrentUser } from "@workspace/auth/session"
```

```bash
pnpm --filter dms add zod server-only
```

Then DMS gets its own symlinks. Same versions still mean **one store copy**:

```text
store
  zod@4.4.3              ← one real copy
  server-only@0.0.1      ← one real copy

packages/auth/node_modules
  zod          → store
  server-only  → store

apps/dms/node_modules
  @workspace/auth → ../../packages/auth
  zod             → store
  server-only     → store
```

Putting them only in the **root** `package.json` does not make them
importable in the package or the app.

**Rule:** declare `zod` and `server-only` in every workspace whose **own**
source imports them. Using `@workspace/auth` does not give the app those
imports for free.

---

## 7. How this repo consumes shared packages

`@workspace/*` is private **source**, not published to npm.

- `exports` maps public paths (`@workspace/ui/components/*` → `src/…`).
- Each Next app lists them in `transpilePackages` so Next compiles the
  TypeScript with the app.

---

## 8. Lockfile, versions, and CI

- `package.json` = allowed range. `pnpm-lock.yaml` = exact graph. Commit it.
- Never edit `node_modules`.
- Pin: `"packageManager": "pnpm@10.33.4"`.
- Local: `pnpm install`. CI: `pnpm install --frozen-lockfile`.
- Cache the **store** in CI, not `node_modules`.
- `pnpm.overrides` can force a transitive version (exception, not default).

---

## 9. pnpm vs Turborepo

- **pnpm** installs and links. `pnpm --filter dms dev` runs that workspace
  script.
- **Turbo** ([`turbo.json`](../../turbo.json)) runs the task graph.
  `dependsOn: ["^build"]` builds workspace deps first. Caches `.next/**`.
  `dev` is `cache: false`, `persistent: true`.
- `turbo run dev --filter="./apps/*"` is a **task** filter, not pnpm’s
  script filter.

Turbo does not install packages. pnpm does not cache the build graph.

---

## Remember this

- One manager: pnpm. Commit the lockfile. CI uses `--frozen-lockfile`.
- Never edit `node_modules`. The store is the real copy.
- Declare every import where you use it — including `zod` and `server-only`.
- Root `package.json` is for repo tools, not app runtime deps.
- Share code with `packages/*` + `workspace:*`, not by dumping deps at root.
- Same version in package + app = two symlinks, one store copy.
- Internal packages: source + `exports` + Next `transpilePackages`.
- pnpm installs. Turbo orders, parallels, and caches tasks.
