# Level 6 — Monorepos

## Learning goals

By the end of this level, you should understand:

- What a monorepo and workspace are.
- How pnpm discovers workspace packages.
- What the `workspace:` protocol guarantees.
- How to design shared packages and internal dependencies.
- How pnpm and Turborepo divide responsibilities.

## 1. What is a monorepo?

A **monorepo** stores multiple related projects in one version-control
repository.

```text
repository/
├── apps/
│   ├── dms/
│   ├── infrastructure/
│   └── auth/
└── packages/
    ├── auth/
    ├── i18n/
    ├── ui/
    ├── eslint-config/
    └── typescript-config/
```

A monorepo is a source-code organization strategy. It does not require one
runtime or one deployment.

In this repository:

- DMS, infrastructure, and auth run as separate Next.js applications.
- Shared packages are consumed as source by those apps.
- Apps can be built and deployed independently.

This is not the same as a monolithic application.

## 2. Workspaces

A **workspace** is a package recognized as part of the repository's
package-manager project.

The root `pnpm-workspace.yaml` defines discovery patterns:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

Every matching directory with a `package.json` becomes a workspace package.

### Workspace root

The repository root coordinates all packages. It usually contains:

- Root `package.json`.
- `pnpm-workspace.yaml`.
- One shared `pnpm-lock.yaml`.
- Task-runner configuration.
- Repository-level tooling.

The root can be private and does not need to be publishable.

### Workspace identity

Every workspace needs a unique package name:

```json
{
  "name": "@workspace/ui",
  "private": true
}
```

Applications also have names:

```json
{
  "name": "dms",
  "private": true
}
```

pnpm filters use these names:

```bash
pnpm --filter dms dev
pnpm --filter @workspace/ui typecheck
```

### One lockfile

pnpm normally creates one workspace lockfile. It contains an importer for
each workspace and one resolved dependency graph.

Benefits:

- Consistent transitive versions.
- Atomic dependency reviews.
- Efficient shared storage.
- One frozen-install input for CI.

## 3. The `workspace:` protocol

An internal dependency can be declared as:

```json
{
  "dependencies": {
    "@workspace/ui": "workspace:*"
  }
}
```

The `workspace:` protocol tells pnpm:

> Resolve this dependency from the current workspace. Do not silently fall
> back to a package with the same name from a registry.

### Common workspace ranges

```text
workspace:*
workspace:^
workspace:~
workspace:1.2.3
```

Their exact publish transformation depends on the declared workspace version
and package-manager behavior.

For private packages that are never published, `workspace:*` clearly states
that the local workspace is required.

### Why not use `"*"`?

This declaration:

```json
{
  "@workspace/ui": "*"
}
```

is a registry-compatible range and does not express the same local-only
guarantee.

`workspace:*` prevents an unexpected registry package from satisfying a
missing local workspace.

### Linking

During installation, pnpm links the consuming workspace to the local package.
Changes in package source are therefore immediately available to development
tools, subject to framework compilation and caching.

## 4. Shared packages

A shared package owns reusable behavior or policy, not an independent
deployment.

Good package candidates:

- UI primitives and design tokens.
- Authentication/session policy shared by apps.
- Localization routing and navigation.
- API contracts used by multiple consumers.
- ESLint and TypeScript configuration.
- Reusable, stable utilities.

Poor package candidates:

- One app's page or route.
- Product-specific business workflow with one consumer.
- Code that imports an app's internal files.
- An abstraction created only because two files look similar.

### App versus package boundary

Use this rule:

```text
Apps own deployment and business behavior.
Packages own reusable contracts and platform behavior.
```

Examples from this repository:

- `apps/auth/auth.ts` belongs to the app because it configures one deployed
  authentication service.
- `packages/auth/src/session.ts` belongs to a package because DMS and
  infrastructure use the same session-reading rules.
- `packages/i18n/src/navigation.ts` belongs to a package because locale-aware
  navigation must be consistent.
- DMS translations remain under `apps/dms/messages` because DMS owns that
  wording.

### Public package API

A package should expose intentional import paths:

```json
{
  "exports": {
    "./session": "./src/session.ts",
    "./redirects": "./src/redirects.ts"
  }
}
```

Consumers then import:

```ts
import { getCurrentUser } from "@workspace/auth/session"
```

They should not reach into:

```ts
import { getCurrentUser } from "../../../packages/auth/src/session"
```

The export map is the package boundary.

## 5. Internal dependencies

An internal dependency is a dependency from one workspace package to
another.

Current high-level direction:

```text
apps/dms ──────────────┐
apps/infrastructure ───┼──> shared packages
apps/auth ─────────────┘

@workspace/auth ──────────> @workspace/i18n
```

Healthy rules:

- Apps may depend on packages.
- Packages must not depend on apps.
- Sibling apps must not import each other.
- Lower-level packages should avoid circular dependencies.

### Why app-to-app imports are harmful

If DMS imports code from the auth app:

- DMS becomes coupled to auth's internal file structure.
- Independent builds become harder.
- Server-only and client boundaries can leak.
- Deployment ownership becomes unclear.

Shared behavior should move to a package with an intentional API.

### Circular dependencies

A cycle looks like:

```text
package-a → package-b → package-a
```

Cycles can cause:

- Partially initialized modules.
- Difficult builds.
- Confusing type relationships.
- Task-runner graph failures.

Break a cycle by:

- Moving shared contracts to a lower-level package.
- Inverting control through callbacks or interfaces.
- Keeping one direction of ownership.

## 6. pnpm workspace architecture

pnpm performs dependency management:

- Discovers workspace packages.
- Resolves internal and external dependencies.
- Maintains the workspace lockfile.
- Stores package content efficiently.
- Links packages into each workspace's `node_modules`.
- Runs scripts and filtered commands.

Turborepo performs task orchestration:

- Understands task relationships.
- Runs tasks in dependency order.
- Runs independent tasks concurrently.
- Caches declared outputs.
- Keeps development tasks persistent.

```text
pnpm
├── packages
├── dependency graph
├── lockfile
└── script execution

Turborepo
├── task graph
├── parallelism
├── caching
└── outputs
```

They complement one another; Turborepo does not install packages, and pnpm
does not replace a full build cache/task graph.

## 7. Filtering workspaces

Run a task in one workspace:

```bash
pnpm --filter dms dev
```

Run it in multiple workspaces:

```bash
pnpm --parallel --filter auth --filter infrastructure dev
```

Run a task in all workspaces that define it:

```bash
pnpm -r typecheck
```

Run a command for a package and dependencies using filter selectors when the
workflow requires it. Always verify selector behavior before using it in CI
or release automation.

### Root scripts

This repository exposes:

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm format
```

Those scripts delegate to Turborepo, which selects and schedules workspace
scripts.

## 8. Adding a new app

A new service should:

1. Create `apps/<name>/package.json` with a unique name.
2. Define independent `dev`, `build`, `start`, `lint`, and `typecheck`
   scripts.
3. Add only the shared packages it actually consumes.
4. Define app-owned routes, messages, and runtime environment.
5. Expose a canonical hostname and deployment boundary.
6. Avoid importing sibling app files.
7. Add authentication only if the service belongs in the shared trust
   boundary.
8. Update repository documentation and verification.

The `apps/*` workspace pattern discovers it automatically.

## 9. Adding a new shared package

A package should:

1. Have at least one clear reusable responsibility.
2. Use a scoped, unique package name.
3. Set `private: true` unless publication is intended.
4. Expose explicit public entry points.
5. Define lint and type-check scripts.
6. Depend only on packages below it in the architecture.
7. Document server-only or client-only constraints.
8. Add real consumers using `workspace:*`.

Do not create a “utils” package that becomes an ownerless collection of
unrelated code.

## 10. Monorepo trade-offs

### Benefits

- Atomic cross-package changes.
- Shared standards and versions.
- Easier refactoring and discovery.
- Efficient installation and caching.
- Consistent CI commands.

### Costs

- Repository-wide changes can affect many teams.
- Task and dependency boundaries require discipline.
- CI needs good filtering and caching as the repo grows.
- A shared lockfile can produce broad changes.
- Internal packages still need stable API design.

### When separate repositories may be better

Consider separation when:

- Teams require independent access control.
- Technologies and release processes are unrelated.
- Sharing is minimal.
- Security boundaries forbid shared source or secrets.
- Repository scale makes coordinated tooling impractical.

Do not split only because applications deploy independently; monorepo apps
can already deploy separately.

## Cumulative lab — Evolve into a workspace

Restructure `package-manager-lab`:

```text
package-manager-lab/
├── apps/
│   └── demo/
├── packages/
│   ├── ui/
│   └── utils/
├── package.json
├── pnpm-workspace.yaml
└── pnpm-lock.yaml
```

### Experiment 1: Internal package resolution

1. Name the UI package `@lab/ui`.
2. Temporarily declare it in the demo app as `"@lab/ui": "*"`.
3. Predict whether pnpm is required to use the local package.
4. Replace it with:

   ```json
   {
     "@lab/ui": "workspace:*"
   }
   ```

5. Run `pnpm install` and inspect the workspace link and lockfile importer.

Explain how `workspace:*` prevents silent registry fallback.

### Experiment 2: React as a peer

1. Make `@lab/ui` render a small React component.
2. Declare a tested React range in `peerDependencies`.
3. Add the exact React version to the UI package's `devDependencies`.
4. Provide React from `apps/demo`.
5. Use `pnpm why react` to inspect the graph.
6. Deliberately make the peer range incompatible, observe the warning, and
   repair it without `--force`.

Explain why two independent React runtimes can break hooks and context even
when both packages install successfully.

## Common mistakes

- Calling a monorepo a runtime monolith.
- Importing sibling app internals.
- Publishing private packages accidentally.
- Using registry ranges for required local packages.
- Moving all similar code into packages too early.
- Creating circular package dependencies.
- Adding dependencies at the root instead of the consuming workspace.
- Assuming pnpm and Turborepo perform the same role.

## Practice

1. Draw the current app-to-package dependency graph.
2. Find three `workspace:*` declarations.
3. Use `pnpm --filter` to type-check one shared package.
4. Explain why `apps/auth` and `packages/auth` are different.
5. Decide where a reusable logout button should live and where its server
   action should live.
6. Design the package boundaries for a future shared backend API client.

## Level summary

- A monorepo can contain independently deployed services.
- Workspaces make multiple packages one package-manager project.
- `workspace:` guarantees local workspace resolution.
- Apps own deployments and product behavior.
- Packages own stable, reusable contracts and platform behavior.
- pnpm manages dependencies; Turborepo orchestrates tasks.

[Previous: Level 5 — Professional Usage](5-professional-usage.md) ·
[Back to the course roadmap](course-roadmap.md) ·
[Next: Level 7 — Package Authoring](7-package-authoring.md)
