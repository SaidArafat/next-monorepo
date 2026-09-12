# Level 5 — Professional Usage

## Learning goals

By the end of this level, you should be able to:

- Use common npm and pnpm commands intentionally.
- Distinguish package scripts from one-time executors.
- Design maintainable project scripts.
- Use overrides safely.
- Produce reproducible installations locally and in CI.

## 1. npm and pnpm command patterns

Both npm and pnpm can install dependencies, run scripts, and execute package
binaries. Their syntax differs in important places.

### Install the complete project

```bash
npm install
pnpm install
```

Use the package manager selected by the repository. In this project, use
pnpm.

### Add a runtime dependency

```bash
npm install zod
pnpm add zod
```

### Add a development dependency

```bash
npm install --save-dev prettier
pnpm add --save-dev prettier
```

Short pnpm form:

```bash
pnpm add -D prettier
```

### Add an exact version

```bash
npm install zod@4.4.3 --save-exact
pnpm add zod@4.4.3 --save-exact
```

### Remove a dependency

```bash
npm uninstall zod
pnpm remove zod
```

### Update dependencies

Update according to declared ranges:

```bash
npm update
pnpm update
```

Update one package:

```bash
pnpm update zod
```

Review available updates:

```bash
pnpm outdated
```

Do not update every major version automatically without reading release and
migration notes.

### Run a script

```bash
npm run build
pnpm run build
```

pnpm also permits:

```bash
pnpm build
```

Using `run` can make it clearer that the command comes from `scripts`.

### Pass arguments to a script

```bash
pnpm test -- --watch
```

The `--` separates package-manager arguments from arguments passed to the
script.

### Run a local binary

```bash
npm exec eslint .
pnpm exec eslint .
```

This uses the version installed for the project instead of an unrelated
global version.

### Inspect dependencies

```bash
pnpm list
pnpm list --depth 3
pnpm why next
```

### Target a workspace

```bash
pnpm --filter dms dev
pnpm --filter @workspace/ui typecheck
pnpm --filter dms add zod
```

Run multiple persistent apps concurrently:

```bash
pnpm --parallel --filter auth --filter dms dev
```

Without `--parallel`, a persistent first command prevents the next selected
app from starting.

### Root workspace operations

pnpm protects the workspace root from accidental dependency additions.
Confirm root intent with `-w`:

```bash
pnpm add -Dw prettier
```

## 2. `npx` and `pnpm dlx`

`npx` and `pnpm dlx` run package-provided command-line tools without adding
them permanently to the current project's dependencies.

Examples:

```bash
npx create-next-app@latest
pnpm dlx create-next-app@latest
```

This is useful for:

- Project generators.
- One-time migrations.
- Scaffolding tools.
- Diagnostic CLIs.

### Local binary versus downloaded binary

Use the project dependency when repeatability matters:

```bash
pnpm exec prettier .
```

Use `pnpm dlx` for a genuinely one-time tool:

```bash
pnpm dlx some-generator@1.2.3
```

Pin a version for important generators and migrations. Running an unpinned
`latest` command on different days can produce different output.

### Security warning

These commands download and execute third-party code. Before running an
unfamiliar package:

- Verify the exact package name to avoid typo-squatting.
- Check the publisher and repository.
- Prefer an explicit version.
- Review what files or credentials the tool can access.

Do not copy an arbitrary `npx` command into a sensitive environment without
review.

### Compare four similar-looking commands

```bash
pnpm dev
pnpm exec next dev
npx next dev
pnpm dlx create-next-app@latest
```

They are not interchangeable:

- `pnpm dev` runs the project's named `dev` script. It is the preferred
  repository interface because the script records flags and conventions.
- `pnpm exec next dev` runs the locally installed `next` binary directly and
  bypasses any extra behavior in the `dev` script.
- `npx next dev` resolves an executable using npm's execution behavior; it
  may use an available local package or obtain one temporarily depending on
  the environment and arguments.
- `pnpm dlx create-next-app@latest` obtains a package in a temporary
  execution environment for a one-time task.

For repeatable team commands, prefer a package script backed by a declared
dependency.

## 3. Package scripts

The `scripts` field creates a stable command interface for humans and CI.

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "test": "vitest run"
  }
}
```

Run them with:

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

### Why scripts are better than remembered commands

Scripts:

- Pin behavior in source control.
- Use local dependency binaries.
- Give developers and CI the same interface.
- Hide platform-specific details.
- Make repository conventions discoverable.

### Script environment

When a script runs:

- `node_modules/.bin` is added to its executable path.
- Environment variables are inherited.
- The working directory is normally the package containing the script.
- Exit code `0` means success; non-zero means failure.

### Lifecycle scripts

Names such as `prebuild` and `postbuild` can run automatically around
`build`:

```json
{
  "scripts": {
    "prebuild": "pnpm typecheck",
    "build": "next build",
    "postbuild": "node scripts/report-size.mjs"
  }
}
```

Automatic lifecycle behavior can be useful but can also hide work. Prefer
explicit task orchestration when the sequence is important.

### Cross-platform scripts

This script is shell-specific:

```json
{
  "scripts": {
    "clean": "rm -rf dist"
  }
}
```

If the team develops on different operating systems, use a cross-platform
tool or Node.js script.

### Script naming conventions

Useful patterns:

```text
test
test:unit
test:integration
lint
lint:fix
format
format:check
typecheck
build
dev
clean
```

Keep common names consistent across workspaces so Turborepo can orchestrate
them.

## 4. Overrides

An override forces a dependency version in the resolved graph, including
transitive dependencies.

With pnpm:

```json
{
  "pnpm": {
    "overrides": {
      "vulnerable-package": "3.2.1"
    }
  }
}
```

A targeted override can constrain one parent relationship:

```json
{
  "pnpm": {
    "overrides": {
      "parent-package>child-package": "2.1.4"
    }
  }
}
```

### Appropriate uses

- Temporarily force a patched security release.
- Work around an incorrect transitive range.
- Keep one compatible version while waiting for upstream.
- Replace a dependency under a controlled migration.

### Risks

An override bypasses the version choice declared by the parent package. A
forced version may have an incompatible API.

For every override:

1. Record why it exists.
2. Link the issue or advisory when possible.
3. Test the affected behavior.
4. Set a removal condition.
5. Recheck it during dependency updates.

An override is a resolution tool, not proof of compatibility.

### npm and Yarn equivalents

npm uses an `overrides` field. Yarn commonly uses `resolutions`. Syntax and
behavior vary, so follow the selected package manager's documentation rather
than copying configuration blindly.

## 5. Reproducible installs

A reproducible install selects the same dependency graph from the same
committed inputs.

The key inputs are:

- `package.json` files.
- The lockfile.
- Package-manager version.
- Node.js version.
- Registry configuration.
- Platform and architecture.
- Approved dependency build scripts.

### Commit the lockfile

The lockfile records exact resolved versions and integrity data. Application
repositories should commit it.

### Pin the package manager

```json
{
  "packageManager": "pnpm@10.33.4"
}
```

This reduces lockfile-format and behavioral differences across machines.

### Pin Node.js

Use repository documentation, an `engines` field, or a version-manager file
to keep local and CI Node.js versions aligned.

### Use frozen installs in CI

```bash
pnpm install --frozen-lockfile
```

This fails instead of changing a stale lockfile.

### Avoid global tooling dependencies

Prefer:

```bash
pnpm exec eslint
```

over:

```bash
eslint
```

when the latter might resolve to an unknown global version.

### Control registries

Repository and CI registry configuration must agree. Private registries may
require environment-provided tokens, but tokens must not be committed.

### Reproducible does not mean identical bytes everywhere

Native and optional packages can differ by operating system or CPU.
Reproducibility means the package manager follows the same declared graph
and platform rules, not that macOS and Linux receive the same native binary.

## 6. A professional dependency-change workflow

### Adding a package

1. Confirm a new dependency is necessary.
2. Check maintenance, licensing, size, and security.
3. Add it to the correct workspace.
4. Review manifest and lockfile changes.
5. Import only its public API.
6. Run type-checking, lint, tests, and builds.
7. Explain the dependency in the pull request.

Example:

```bash
pnpm --filter dms add zod
pnpm typecheck
pnpm lint
pnpm build
```

### Updating a package

1. Read changelogs and migration notes.
2. Update one logical group at a time.
3. Review transitive lockfile changes.
4. Run focused and repository-wide checks.
5. Verify runtime behavior for framework and auth upgrades.

### Removing a package

1. Remove every import and configuration reference.
2. Use `pnpm remove` in the correct workspace.
3. Verify it is no longer needed transitively with `pnpm why`.
4. Run quality checks.

## Useful CI sequence

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

This repository does not yet define a `test` script, so add that step only
after a test task exists.

## Cumulative lab — Break and repair reproducibility

Continue in `package-manager-lab`:

1. Commit or copy the current `package.json` and `pnpm-lock.yaml`.
2. Change a dependency declaration without running pnpm.
3. Predict what this command will do:

   ```bash
   pnpm install --frozen-lockfile
   ```

4. Run it and read the complete error.
5. Run `pnpm install` to update the lockfile intentionally.
6. Review exactly what changed.
7. Run the frozen install again.

Optional override exercise:

1. Trace a transitive package with `pnpm why`.
2. Draft a narrow override.
3. State the compatibility evidence and removal condition before applying it.
4. Remove the experiment after understanding the resulting graph.

The objective is to diagnose stale inputs rather than “fixing” them by
deleting the lockfile.

## Common mistakes

- Running npm in a pnpm repository.
- Adding every dependency at the workspace root.
- Using `pnpm dlx` for a tool that should be pinned and repeatable.
- Hiding a long build pipeline in lifecycle scripts.
- Keeping undocumented overrides forever.
- Allowing CI to rewrite the lockfile.
- Depending on globally installed versions.
- Updating framework and authentication packages without integration tests.

## Practice

1. Use `pnpm --filter` to run DMS type-checking.
2. Explain when to use `pnpm exec` versus `pnpm dlx`.
3. Add a hypothetical script for checking formatting.
4. Draft an override comment and removal condition for a security fix.
5. Explain every input required for a reproducible install.
6. Compare `pnpm install` with `pnpm install --frozen-lockfile`.

## Level summary

- Use the package manager selected by the repository.
- Target the correct workspace when adding or running dependencies.
- Use scripts as a stable interface for developers and CI.
- Use one-time executors carefully and preferably with pinned versions.
- Treat overrides as temporary, tested exceptions.
- Commit the lockfile and use frozen installs in CI.

[Previous: Level 4 — Dependency Graph](4-dependency-graph.md) ·
[Back to the course roadmap](course-roadmap.md) ·
[Next: Level 6 — Monorepos](6-monorepos.md)
