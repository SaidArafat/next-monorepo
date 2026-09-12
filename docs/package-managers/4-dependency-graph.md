# Level 4 — Dependency Graph

## Learning goals

By the end of this level, you should understand:

- Direct and transitive dependencies.
- Why peer dependencies describe compatibility.
- When optional dependencies are appropriate.
- How dependency conflicts occur and how to investigate them.

## 1. What is a dependency graph?

Dependencies form a graph rather than a flat list.

```text
application
├── framework
│   ├── compiler
│   └── router
├── validation-library
└── authentication-library
    ├── crypto-library
    └── validation-library
```

The application is the root. Every line represents a dependency relationship.
A package can appear through more than one path.

A real graph records:

- Package names.
- Selected versions.
- Which package requires which dependency.
- Peer requirements.
- Optional or platform-specific edges.

The lockfile is the most complete project record of this graph.

## 2. Direct dependencies

A **direct dependency** is declared by the current package in its own
`package.json`.

```json
{
  "dependencies": {
    "next": "16.2.6",
    "react": "19.2.4",
    "zod": "^4.4.3"
  }
}
```

If this package imports `zod`, then `zod` should normally be direct:

```ts
import { z } from "zod"
```

### Why direct declarations matter

They:

- Document what the package intentionally uses.
- Define compatible version ranges.
- Prevent accidental reliance on another package's internals.
- Let package managers construct correct isolated environments.
- Tell library consumers which runtime code will be installed.

### Production versus development edges

Both `dependencies` and `devDependencies` are direct declarations. They
differ in purpose, not directness.

```text
Current package
├── dependency: runtime relationship
└── devDependency: development relationship
```

## 3. Transitive dependencies

A **transitive dependency** is required by one of your dependencies rather
than declared directly by your package.

```text
Your app
└── authentication-library
    └── crypto-library
```

The crypto library is transitive from your app's perspective.

### Do not import undeclared transitive packages

This is fragile:

```ts
// Wrong when crypto-library is not declared by this package
import cryptoHelper from "crypto-library"
```

It may work in a hoisted `node_modules` layout and then fail:

- After an update.
- Under pnpm's stricter layout.
- In a packaged library.
- In CI or production.

If your code imports it, declare it directly.

### Transitive updates

Your lockfile can change even when your direct dependency range does not.
For example, reinstalling or updating can select a newer compatible
transitive dependency.

Inspect why a package exists:

```bash
pnpm why package-name
```

Inspect a dependency tree:

```bash
pnpm list --depth 3
```

### Ownership

You do not control a transitive dependency's declaration, but you are still
responsible for:

- Reviewing security advisories.
- Testing updates.
- Applying temporary overrides when necessary.
- Asking the direct dependency's maintainer for a durable fix.

## 4. Peer dependencies

A **peer dependency** says:

> This package needs to work with a package supplied by its consumer.

A React component library might declare:

```json
{
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

The component library does not want a private, isolated React runtime. It
wants to use the application's React instance.

### Why peers exist

Peer dependencies are common for:

- Framework plugins.
- React component libraries.
- ESLint plugins and configs.
- Build-tool plugins.
- Packages that extend a host library.

They prevent or warn about incompatible duplicate host instances.

### Dependency versus peer dependency

Use a normal dependency when your package owns and uses its own copy.

Use a peer dependency when:

- The consumer must provide the host package.
- Your package integrates with that host.
- Both packages must operate on one compatible runtime instance.

### Peer range

The range communicates compatibility:

```json
{
  "peerDependencies": {
    "next": ">=16"
  }
}
```

This does not prove compatibility with every future version. Keep peer
ranges broad enough for consumers but narrow enough to reflect actual
testing.

Modern package managers may auto-install a peer when possible. That does not
change the contract: the consuming dependency environment still needs one
compatible host version. Do not use an unlimited range such as `>=18`
unless the package has actually been tested against every major version that
range permits.

### Peers during package development

A library often declares a framework as:

- A `peerDependency` for consumers.
- A `devDependency` for local type-checking and tests.

```json
{
  "peerDependencies": {
    "react": "^19.0.0"
  },
  "devDependencies": {
    "react": "19.2.4"
  }
}
```

### Peer variants in pnpm

The same package version can be installed in different peer contexts. pnpm
may encode that context in lockfile and `.pnpm` paths. That is why generated
paths can be long.

## 5. Optional dependencies

An **optional dependency** is allowed to fail installation without making
the entire package installation fail.

```json
{
  "optionalDependencies": {
    "platform-specific-optimizer": "^2.0.0"
  }
}
```

Use cases include:

- Platform-specific native binaries.
- Optional performance enhancements.
- Features that have a supported fallback.

Application code must handle absence:

```ts
let optimizer

try {
  optimizer = await import("platform-specific-optimizer")
} catch {
  optimizer = null
}
```

### Optional does not mean unimportant

If the application cannot operate correctly without the package, it should
not be optional.

### Platform filtering

Packages can declare operating-system or CPU constraints. The package
manager may skip an optional package that does not match the current
platform.

This is common when one parent package lists several platform-specific
binary packages.

## 6. Dependency conflicts

A conflict occurs when dependency requirements cannot be satisfied cleanly
in one intended context.

### Incompatible normal dependency ranges

```text
package-a requires shared-lib ^1
package-b requires shared-lib ^2
```

The package manager may install both versions:

```text
package-a → shared-lib 1.8.0
package-b → shared-lib 2.3.0
```

This is often valid, but it increases bundle size and can break identity
assumptions if objects cross between versions.

### Peer dependency conflict

```text
application provides react 19
old-plugin requires peer react ^18
```

Installing two isolated React copies does not satisfy the plugin's intended
contract. The correct solution is usually to:

- Upgrade the plugin.
- Use a compatible host version.
- Replace the plugin.
- Confirm upstream support.

Ignoring peer warnings can hide real runtime incompatibility.

Flags such as `--force` can bypass or weaken normal protections for a
specific install command, but they do not make incompatible packages
compatible. Diagnose the graph before considering such a flag.

### Duplicate singleton libraries

Some packages expect one runtime instance:

- React.
- State containers with global context.
- Framework plugin hosts.
- Styling engines with shared registries.

Two versions can cause invalid hook calls, missing context, or incompatible
objects.

### Type conflicts

Two copies of a type-heavy library can produce TypeScript incompatibilities,
especially when classes contain private fields or types depend on exact
package identities.

### Lockfile conflicts

Git merge conflicts in a lockfile are graph conflicts, not ordinary text
formatting problems. Resolve the manifests and regenerate with the package
manager.

## 7. Investigating a conflict

### Step 1: Identify the paths

```bash
pnpm why conflicting-package
```

### Step 2: Inspect available updates

```bash
pnpm outdated
```

### Step 3: Read peer warnings

Find:

- The package imposing the range.
- The host version provided.
- Whether a newer compatible version exists.

### Step 4: Prefer a direct compatible upgrade

Upgrade the package that declares the old requirement rather than forcing a
random transitive version.

### Step 5: Use overrides only when justified

An override can force a transitive selection:

```json
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "3.2.1"
    }
  }
}
```

Before doing this:

- Verify the forced version is API-compatible.
- Run tests and builds.
- Document why the override exists.
- Remove it when upstream fixes the dependency.

An override changes resolution; it does not make incompatible code
compatible.

### Step 6: Reinstall reproducibly

After resolving declarations:

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm build
```

## Cumulative lab — Create and diagnose a peer conflict

Extend `package-manager-lab` into a tiny workspace:

```text
package-manager-lab/
├── apps/demo/
├── packages/ui/
└── pnpm-workspace.yaml
```

Give `packages/ui` a deliberately incompatible React peer range relative to
`apps/demo`.

Then:

1. Run `pnpm install`.
2. Read the complete peer warning.
3. Use `pnpm why react`.
4. Identify the package that provides React and the package that constrains
   it.
5. Fix the peer range to match versions the UI package genuinely supports.
6. Reinstall without `--force`.

The goal is not merely to remove the warning. Explain why a shared React
runtime matters for hooks and context.

## 8. Reading this monorepo's graph

The high-level graph is:

```text
apps/dms
├── @workspace/auth
├── @workspace/i18n
└── @workspace/ui

apps/infrastructure
├── @workspace/auth
├── @workspace/i18n
└── @workspace/ui

apps/auth
├── @workspace/auth
├── @workspace/i18n
└── @workspace/ui

@workspace/auth
└── @workspace/i18n
```

This follows a useful boundary:

- Apps depend on packages.
- Shared packages do not depend on apps.
- Sibling apps do not import one another.

## Common mistakes

- Importing an undeclared transitive dependency.
- Moving a normal dependency to peers just to reduce installation size.
- Ignoring every peer warning.
- Making a required native package optional without a fallback.
- Forcing incompatible versions through overrides.
- Assuming duplicate versions are always errors.
- Assuming successful installation guarantees runtime compatibility.

## Practice

1. Run `pnpm why next-intl`.
2. Identify one direct and one transitive dependency.
3. Find a `peerDependencies` declaration in `packages/`.
4. Explain why Next.js is a peer of `@workspace/auth`.
5. Draw the dependency path from `apps/dms` to `next-intl`.
6. Describe when two versions can coexist and when a singleton conflict
   makes that unsafe.

## Level summary

- Direct dependencies are declared by the current package.
- Transitive dependencies arrive through another dependency.
- Peer dependencies require a compatible consumer-provided host.
- Optional dependencies need a valid absence path.
- Conflicts require graph investigation, not random lockfile deletion.

[Previous: Level 3 — Installation](3-installation.md) ·
[Back to the course roadmap](course-roadmap.md) ·
[Next: Level 5 — Professional Usage](5-professional-usage.md)
