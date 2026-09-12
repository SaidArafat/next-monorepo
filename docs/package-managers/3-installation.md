# Level 3 — Installation

## Learning goals

By the end of this level, you should understand:

- What `node_modules` represents.
- The roles of npm, Yarn, and pnpm.
- How pnpm's content-addressable store works.
- Why installation layouts differ between package managers.

## 1. What happens during installation?

When you run:

```bash
pnpm install
```

the package manager:

1. Finds workspace manifests.
2. Reads dependency ranges.
3. Reads the existing lockfile.
4. Resolves any missing or changed versions.
5. Downloads package archives when they are not cached.
6. Verifies package integrity.
7. Makes packages available through `node_modules`.
8. Updates the lockfile when permitted and necessary.
9. Runs allowed lifecycle/build scripts.

Installation is therefore more than downloading files. It creates a local
representation of a resolved dependency graph.

## 2. `node_modules`

`node_modules` is the conventional directory through which Node.js projects
access installed packages.

A simple layout might look like:

```text
project/
├── package.json
├── lockfile
├── node_modules/
│   ├── react/
│   ├── zod/
│   └── ...
└── src/
```

### Do not commit `node_modules`

It is:

- Large.
- Platform-dependent.
- Recreated from manifests and a lockfile.
- Filled with third-party generated content.

Commit:

- `package.json`
- The chosen lockfile
- Package-manager configuration

Ignore:

- `node_modules`

### Module resolution

When code imports:

```ts
import { z } from "zod"
```

the runtime or bundler resolves the `zod` package according to Node.js and
the tool's module-resolution rules. The exact physical layout differs among
package managers, but `node_modules` presents importable package paths.

### Hoisted layout

npm and the classic Yarn `node_modules` linker commonly hoist many packages
toward the project root:

```text
node_modules/
├── direct-package/
├── transitive-package/
└── shared-package/
```

This can reduce duplicate folders, but it can also let code import an
undeclared transitive package accidentally.

### pnpm layout

pnpm uses a content-addressable store and links a dependency graph under
`node_modules/.pnpm`:

```text
node_modules/
├── .pnpm/
│   ├── react@19.2.4/
│   └── zod@4.4.3/
├── react -> .pnpm/.../react
└── zod -> .pnpm/.../zod
```

The exact generated path can include peer dependency information. Do not
depend on or manually edit that internal path.

### Never fix packages inside `node_modules`

Changes will disappear on reinstall and will not be reproduced in CI.

Use one of these approaches instead:

- Upgrade or downgrade the dependency.
- Report or fix the upstream package.
- Use a package-manager-supported patch mechanism.
- Use an override when the issue is a transitive version.

## 3. npm

npm is both:

- The name of the default public JavaScript registry.
- A package-manager CLI distributed with Node.js.

Common commands:

```bash
npm install
npm install zod
npm install --save-dev prettier
npm uninstall zod
npm run build
npm exec eslint
```

npm uses `package-lock.json`.

### Strengths

- Installed with Node.js.
- Widely documented and supported.
- Familiar to most JavaScript developers.
- Supports workspaces and modern lockfiles.

### Considerations

- Its installation and workspace behavior differs from pnpm.
- Running npm in a pnpm repository can create an unwanted
  `package-lock.json`.
- Teams should standardize on one package manager per repository.

## 4. Yarn

Yarn is another JavaScript package manager. Its major generations can use
different installation strategies.

Common commands:

```bash
yarn install
yarn add zod
yarn add --dev prettier
yarn remove zod
yarn build
yarn dlx create-next-app
```

Yarn uses `yarn.lock`.

### Yarn installation modes

Depending on project configuration, Yarn can use:

- A traditional `node_modules` linker.
- Plug'n'Play, which maps package access without a normal `node_modules`
  tree.

Plug'n'Play can provide strict dependency boundaries, but every tool must be
compatible with its resolution model.

### Strengths

- Strong workspace support.
- Configurable installation strategies.
- Useful constraints and plugin ecosystem in modern Yarn.

### Considerations

- Commands and configuration differ across Yarn versions.
- Always inspect the repository's `packageManager` field and Yarn config
  before following version-specific instructions.

## 5. pnpm

pnpm is the package manager used by this repository.

Common commands:

```bash
pnpm install
pnpm add zod
pnpm add -D prettier
pnpm remove zod
pnpm build
pnpm exec eslint
pnpm dlx create-next-app
```

pnpm uses `pnpm-lock.yaml`.

### Why pnpm is different

pnpm avoids copying the same package contents into every project. It stores
package content once and links projects to it.

Benefits:

- Efficient disk usage.
- Fast installations after packages are cached.
- Strong workspace support.
- Stricter dependency access.
- One lockfile for the workspace.

### Strict dependency access

A project should declare every package it imports. pnpm's layout makes
undeclared dependency usage less likely to work accidentally.

If this import fails:

```ts
import something from "transitive-package"
```

the fix is usually to declare `transitive-package` directly, not to force
pnpm to expose another package's private dependency.

### Selecting a workspace

Run a command for one package:

```bash
pnpm --filter auth dev
```

Run a command for several packages in parallel:

```bash
pnpm --parallel --filter auth --filter dms dev
```

Add a dependency to one workspace:

```bash
pnpm --filter dms add zod
```

Add a development dependency to the workspace root:

```bash
pnpm add -Dw prettier
```

`-w` confirms that the root workspace is the intended target.

## 6. The pnpm store

pnpm keeps package content in a shared, configurable content-addressable
store outside the project. Files are identified by content so projects can
reuse stored data instead of downloading independent archives repeatedly.

Conceptually:

```text
Registry or another source
   ↓ retrieve missing content
Shared pnpm store
   ↓ import and link
Project A node_modules
Project B node_modules
Project C node_modules
```

If three projects use the same package content, the store can reuse it.
Depending on filesystem and pnpm configuration, importing files from the
store can use hard links, reflinks, or copies. Symlinks then expose the
virtual dependency graph through `node_modules`.

### Store commands

Show the store location:

```bash
pnpm store path
```

Remove unreferenced packages from the store:

```bash
pnpm store prune
```

Check stored package integrity:

```bash
pnpm store status
```

Do not routinely delete the store. It is a cache and content source that
makes later installs faster.

### Store versus project lockfile

The store does not decide which version a project uses.

- `package.json` declares acceptable dependencies.
- `pnpm-lock.yaml` records the selected dependency graph.
- The pnpm store holds reusable package content.
- `node_modules` links the project to the required content.

### Links and portability

pnpm uses links to expose package files efficiently. The generated
`node_modules` directory should still be recreated on each machine rather
than copied between operating systems or deployment environments.

## 7. Package manager selection

Before running an install, inspect:

1. The root `packageManager` field.
2. Existing lockfiles.
3. Workspace configuration.
4. Repository documentation.

This project declares:

```json
{
  "packageManager": "pnpm@10.33.4"
}
```

Use the declared pnpm version to minimize lockfile and behavior differences.
Corepack can help activate a project-declared package manager when it is
available in the installed Node.js distribution.

## Installation flags worth knowing

Install exactly from the lockfile:

```bash
pnpm install --frozen-lockfile
```

Install without modifying the lockfile:

```bash
pnpm install --frozen-lockfile
```

Install production dependencies only:

```bash
pnpm install --prod
```

Prefer cached packages and fail if required content is unavailable:

```bash
pnpm install --offline
```

Use cached content when available but permit network access:

```bash
pnpm install --prefer-offline
```

## Cumulative lab — Inspect pnpm's layout

Continue in `package-manager-lab`:

```bash
pnpm store path
pnpm list --depth 2
```

Inspect, but do not edit:

```text
node_modules
node_modules/.pnpm
pnpm-lock.yaml
```

Answer:

1. Which top-level entries are links?
2. Where does Axios appear under `.pnpm`?
3. Which transitive dependencies does the lockfile record?
4. Does `pnpm store path` point inside or outside the project?
5. What changes after deleting only `node_modules` and running
   `pnpm install --offline`?

If offline installation fails, explain which required content was not
available rather than deleting the store.

## Lifecycle scripts and trust

Some packages execute scripts during installation to compile native code or
download platform-specific binaries. Installation scripts can be a supply
chain risk because they execute code on the machine.

This repository's workspace configuration explicitly controls selected
dependency builds with `allowBuilds`.

Review unexpected build scripts instead of approving all packages
automatically.

## Common mistakes

- Committing `node_modules`.
- Mixing package managers in one repository.
- Manually changing files under `node_modules`.
- Assuming every package is physically copied into each pnpm project.
- Deleting the pnpm store whenever an application has a bug.
- Importing a transitive dependency without declaring it.
- Running a root `pnpm add` without confirming the workspace target.
- Ignoring install-script security prompts.

## Practice

1. Run `pnpm store path`.
2. Inspect `node_modules` and `node_modules/.pnpm` without editing them.
3. Use `pnpm --filter` to run one app's `typecheck` script.
4. Find the root `packageManager` declaration.
5. Explain the roles of `package.json`, `pnpm-lock.yaml`, the store, and
   `node_modules`.
6. Explain why a cached install can be much faster than the first install.

## Level summary

- Installation resolves and materializes a dependency graph.
- `node_modules` is generated and should not be committed.
- npm, Yarn, and pnpm use different commands and installation models.
- pnpm links projects to a shared content-addressable store.
- Always use the package manager and version selected by the repository.

[Previous: Level 2 — Versions](2-versions.md) ·
[Back to the course roadmap](course-roadmap.md) ·
[Next: Level 4 — Dependency Graph](4-dependency-graph.md)
