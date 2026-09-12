# Level 2 — Versions

## Learning goals

By the end of this level, you should understand:

- Semantic Versioning.
- Exact versions and version ranges.
- How a package manager resolves a dependency graph.
- Why a lockfile must be committed.

## 1. Semantic Versioning

JavaScript packages commonly use **Semantic Versioning**, abbreviated as
SemVer.

```text
MAJOR.MINOR.PATCH
  3  .  7  .  2
```

Each number communicates the type of change:

- **MAJOR**: incompatible or breaking changes.
- **MINOR**: backward-compatible features.
- **PATCH**: backward-compatible fixes.

For version `3.7.2`:

- `3` is the major version.
- `7` is the minor version.
- `2` is the patch version.

### Version-change examples

Suppose a package is currently `2.4.1`:

- Fixing a bug could produce `2.4.2`.
- Adding an optional API could produce `2.5.0`.
- Removing or changing an existing API could produce `3.0.0`.

SemVer communicates intent; it does not guarantee that every publisher
classifies every change correctly.

### Pre-release versions

A version can include a pre-release identifier:

```text
5.0.0-beta.32
2.0.0-rc.1
1.4.0-alpha.3
```

Typical progression:

```text
alpha → beta → release candidate → stable
```

Pre-release versions can change more frequently and may not obey normal
compatibility expectations. This repository intentionally pins
`next-auth` to the exact beta version `5.0.0-beta.32` because its session
cookie behavior is security-sensitive.

### Build metadata

SemVer also permits build metadata:

```text
1.2.3+build.45
```

Build metadata identifies a build but does not affect version precedence.

### Versions below `1.0.0`

Packages below `1.0.0` often change quickly. SemVer still has rules, but
publishers may use minor versions for breaking changes. Read the package's
release policy rather than assuming stability.

## 2. Version ranges

A dependency entry can request one exact version or a range of acceptable
versions.

### Exact version

```json
{
  "dependencies": {
    "react": "19.2.4"
  }
}
```

Only version `19.2.4` satisfies this declaration.

Exact versions maximize control but require deliberate updates.

### Caret range

```json
{
  "dependencies": {
    "zod": "^4.4.3"
  }
}
```

For versions at or above `1.0.0`, `^4.4.3` generally accepts:

```text
>=4.4.3 and <5.0.0
```

It permits minor and patch updates without permitting the next major.

Special care is required for `0.x` packages:

- `^0.4.3` generally means `>=0.4.3 <0.5.0`.
- `^0.0.3` generally means `>=0.0.3 <0.0.4`.

### Tilde range

```json
{
  "dependencies": {
    "example": "~2.4.1"
  }
}
```

`~2.4.1` generally accepts:

```text
>=2.4.1 and <2.5.0
```

It normally permits patch updates but not a new minor version.

```
Comparison ranges
```

```text
>=2.0.0
>=2.0.0 <3.0.0
>1.0.0 <=1.5.0
```

These ranges express explicit mathematical boundaries.

### OR ranges

```text
^2.0.0 || ^3.0.0
```

This accepts a compatible version from either major line.

### Broad ranges

```text
*
latest
```

Broad ranges reduce control and make compatibility harder to reason about.
They are usually inappropriate for production projects.

### Workspace protocol

Monorepos can use:

```json
{
  "dependencies": {
    "@workspace/ui": "workspace:*"
  }
}
```

This means the dependency must resolve to a matching package in the current
workspace rather than silently downloading a registry package.

### Range versus installed version

If `package.json` contains:

```text
^4.4.3
```

the lockfile might currently select:

```text
4.7.1
```

The range is the allowed contract. The lockfile records the selected result.

## 3. Dependency resolution

Dependency resolution is the process of selecting one concrete version for
every requirement in the dependency graph.

Consider:

```text
App
├── package-a → shared-lib ^2.0.0
└── package-b → shared-lib ^2.3.0
```

A resolver may select one version such as `shared-lib@2.5.1` because it
satisfies both ranges.

Now consider:

```text
App
├── package-a → shared-lib ^1.0.0
└── package-b → shared-lib ^2.0.0
```

No version satisfies both ranges. The package manager may install two
versions, isolate them, or report a conflict depending on the dependency
type and package-manager strategy.

### Resolution inputs

The package manager considers:

- Root `package.json` requirements.
- Requirements from direct and transitive dependencies.
- Existing lockfile selections.
- Peer dependency constraints.
- Overrides or resolutions.
- Package-manager configuration.
- Available versions in the registry.
- Platform and optional-dependency conditions.

### Deduplication

When compatible consumers can share one version, package managers may
deduplicate it. This reduces storage and avoids multiple runtime copies.

Deduplication is an optimization, not a guarantee that only one package
version will exist.

### Hoisting

Some installation strategies place dependencies higher in the
`node_modules` tree so multiple packages can access them.

Hoisting can create **phantom dependencies**: code can import a package that
was installed for another dependency but was never declared in its own
`package.json`.

pnpm's linking strategy is stricter and exposes fewer phantom dependencies
than a traditionally flat installation.

### Deterministic resolution

Without a lockfile, two installations at different times can select
different versions from the same ranges. With a lockfile and a compatible
package-manager version, the resolver should reproduce the recorded graph.

## 4. Lockfiles

A lockfile records the exact resolved dependency graph.

Common lockfiles:

- npm: `package-lock.json`
- Yarn: `yarn.lock`
- pnpm: `pnpm-lock.yaml`

This repository uses `pnpm-lock.yaml`.

### What a lockfile records

Depending on the package manager, it can include:

- Exact package versions.
- Download locations.
- Integrity hashes.
- Dependency relationships.
- Peer dependency variants.
- Workspace importers.
- Lockfile format version.

### Why commit it?

Applications should commit their lockfile because it provides:

- Reproducible local and CI installs.
- Reviewable dependency changes.
- Consistent security-scanner input.
- Faster resolution.
- Protection from unexpected new transitive versions.

### Do not edit it manually

Use the package manager to change dependencies:

```bash
pnpm add zod
pnpm remove zod
pnpm update zod
```

The package manager updates both the manifest and lockfile consistently.

### Frozen installs

In CI, use:

```bash
pnpm install --frozen-lockfile
```

The command fails when `package.json` and `pnpm-lock.yaml` disagree. This
prevents CI from silently creating a different dependency graph.

### One package manager per lockfile

Avoid committing several competing lockfiles:

```text
package-lock.json
yarn.lock
pnpm-lock.yaml
```

Choose the project's package manager and use its lockfile. This repository
declares pnpm in the root `packageManager` field.

### Lockfile merge conflicts

When branches change dependencies:

1. Resolve the affected `package.json` files correctly.
2. Run `pnpm install`.
3. Let pnpm regenerate a consistent lockfile.
4. Review the resulting dependency changes.

Do not resolve a lockfile conflict by selecting one side without checking
the manifests.

## How ranges and lockfiles work together

```text
package.json
  Declares: zod ^4.4.3
        ↓
Resolver checks registry and constraints
        ↓
pnpm-lock.yaml
  Records: exact selected version and graph
        ↓
node_modules
  Links the locked package
```

Changing the lockfile does not change the declared range. Changing the range
can require a new lockfile resolution.

## `pnpm install` versus `pnpm update`

Both commands use the manifest and lockfile, but their intent differs:

- `pnpm install` reproduces the locked graph when it is valid and resolves
  only what is missing or inconsistent.
- `pnpm update` actively searches for newer versions allowed by the selected
  ranges and updates lockfile selections.

An install is not a request to upgrade every dependency. The existing
lockfile is an input to installation, not merely output from an earlier
resolver run.

## Useful commands

Inspect why a package is installed:

```bash
pnpm why zod
```

List outdated dependencies:

```bash
pnpm outdated
```

Update one dependency within its allowed range:

```bash
pnpm update zod
```

Install exactly one version:

```bash
pnpm add zod@4.4.3 --save-exact
```

## Cumulative lab — Compare version policies

Continue in `package-manager-lab`.

1. Record the current Axios declaration and locked version.
2. Install one concrete version exactly:

```bash
 pnpm add axios@1.12.0 --save-exact
```

3. Change only the declaration to a compatible caret range:

```bash
 pnpm add axios@^1.12.0
```

4. Run `pnpm install` and inspect whether the locked version changes.
5. Run `pnpm update axios` and inspect again.
6. Repeat with `~1.12.0`.

For each step, write down:

- The range in `package.json`.
- The concrete version in `pnpm-lock.yaml`.
- Whether install or update changed the selection.
- Which future major, minor, or patch versions the range permits.

Do not copy an artificial range such as `^1.x.x`; use a real concrete base
version and let the package manager save its configured range.

## Common mistakes

- Assuming `^` means “always use this exact version.”
- Assuming every minor update is truly backward-compatible.
- Deleting the lockfile to fix an unexplained problem.
- Mixing npm, Yarn, and pnpm lockfiles.
- Reviewing `package.json` but ignoring a large lockfile change.
- Using an unbounded range for production dependencies.
- Manually editing resolved entries in the lockfile.

## Practice

1. Find one exact dependency version in this repository.
2. Find one caret range.
3. Explain which updates each declaration accepts.
4. Use `pnpm why` to trace a transitive package.
5. Compare a dependency's declared version with its lockfile resolution.
6. Explain why `next-auth@5.0.0-beta.32` is pinned exactly.

## Level summary

- SemVer communicates major, minor, and patch intent.
- Version ranges define acceptable versions.
- Resolution selects concrete versions for the full graph.
- A lockfile records that concrete graph.
- Commit the lockfile and use frozen installs in CI.

[Previous: Level 1 — Foundations](1-foundations.md) ·
[Back to the course roadmap](course-roadmap.md) ·
[Next: Level 3 — Installation](3-installation.md)
