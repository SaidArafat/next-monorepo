# Level 1 — Foundations

## Learning goals

By the end of this level, you should understand:

- What a software package is.
- The difference between a registry and a package manager.
- Why JavaScript projects use `package.json`.
- The difference between runtime and development dependencies.

## 1. What is a package?

A **package** is a software unit or project boundary described by a package
manifest. It can be a reusable library, an application, a command-line tool,
or a private workspace package. It usually has:

- A name and version.
- Source code or compiled code.
- Metadata describing how it should be used.
- Zero or more dependencies on other packages.
- An entry point or explicit exports.

Examples include:

- `react`, which provides APIs for building user interfaces.
- `zod`, which validates data at runtime.
- `eslint`, which analyzes source code.
- `@workspace/auth`, an internal package in this monorepo.

A package is not necessarily an application. An application is normally
something users run or deploy. A package is normally consumed by an
application or another package.

```text
Application
├── Package A
│   └── Package C
└── Package B
```

Packages can make tested behavior reusable, but reuse and publication are
not requirements. A private application with a `package.json` is also a
package from the package manager's perspective.

### Package versus module

The terms are related but not identical:

- A **module** is usually one source file or one importable JavaScript unit.
- A **package** is a published or workspace directory that can contain many
  modules.

For example, `next-auth` is a package, while
`next-auth/providers/credentials` is one module exported by that package.

### Public and private packages

- A **public package** can be downloaded by anyone from a public registry.
- A **private package** requires authorization.
- A **workspace package** lives inside the current monorepo and may never be
  published.

In this repository, packages such as `@workspace/ui` are private workspace
packages.

## 2. Registry versus package manager

A **registry** is a server that stores package metadata and package archives.

The default JavaScript registry is the npm registry:

```text
https://registry.npmjs.org
```

A registry answers questions such as:

- Which versions of `react` exist?
- What dependencies does version `19.2.4` require?
- Where can that package archive be downloaded?
- Is this package deprecated?

A **package manager** is the tool installed on your computer or CI server. It
communicates with registries and manages the local project.

Common JavaScript package managers:

- npm
- Yarn
- pnpm

A package manager can:

- Read `package.json`.
- Resolve compatible versions.
- Download packages from a registry.
- Create or update a lockfile.
- Link packages into `node_modules`.
- Run project scripts.
- Manage workspaces.

```text
Developer runs pnpm install
        ↓
pnpm reads package.json and the existing lockfile
        ↓
pnpm resolves workspace, local, cached, registry, or other sources
        ↓
pnpm retrieves missing package content
        ↓
pnpm updates links, node_modules, and the lockfile when needed
```

The npm registry and the npm package manager share a name, but they are
different things. pnpm can download packages from the npm registry too.

A package manager's central job is to **describe, retrieve, resolve, install,
update, and reproduce a dependency graph**. It does not always contact the
npm registry: a dependency can already be cached or come from a workspace,
local path, tarball, Git repository, or custom registry.

## 3. What is `package.json`?

`package.json` is the manifest for a JavaScript package or application. It is
JSON, so it must use double quotes and cannot contain comments.

A small example:

```json
{
  "name": "example-app",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build"
  },
  "dependencies": {
    "next": "16.2.6",
    "react": "19.2.4"
  },
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

Important fields:

- `name`: the package name used by tools and imports.
- `version`: the package's current semantic version.
- `private`: prevents accidental publishing when set to `true`.
- `type`: controls whether `.js` files use ES modules or CommonJS.
- `scripts`: named commands that the package manager can run.
- `dependencies`: packages needed by the delivered software.
- `devDependencies`: packages needed to develop or build it.
- `peerDependencies`: compatibility requirements supplied by the consumer.
- `engines`: expected Node.js or package-manager versions.
- `exports`: the package's public import paths.

### Manifest versus lockfile

`package.json` describes the versions the project accepts. A lockfile records
the exact dependency graph selected during installation.

Do not manually treat `package.json` as a list of downloaded files. It is the
project's declared dependency contract.

## 4. What are `dependencies`?

`dependencies` are packages required by the application or library when its
delivered behavior runs.

Install a runtime dependency with pnpm:

```bash
pnpm add zod
```

This adds an entry similar to:

```json
{
  "dependencies": {
    "zod": "^4.4.3"
  }
}
```

Typical runtime dependencies:

- Frameworks and UI libraries.
- Validation libraries used by application code.
- Database or HTTP clients.
- Authentication libraries.
- Utilities imported by production code.

For a frontend application, “runtime” does not always mean installed on the
production server. It means the package contributes to application behavior
or its production bundle.

### How to decide

Ask:

> If this package were missing when the app is built or executed for users,
> would the delivered behavior fail?

If yes, it is usually a dependency.

## 5. What are `devDependencies`?

`devDependencies` support development, validation, testing, or building but
are not part of the package's public runtime behavior.

Install one with:

```bash
pnpm add --save-dev prettier
```

The short form is:

```bash
pnpm add -D prettier
```

Typical development dependencies:

- TypeScript.
- ESLint and Prettier.
- Test runners.
- Type declarations such as `@types/node`.
- Build tools used only to produce distributable files.

### Application nuance

Modern frameworks build applications before deployment. A deployment system
may still install development dependencies during the build stage, even if
they are excluded from the final runtime image.

### Library nuance

If your package imports another package in code that consumers execute, that
package generally belongs in `dependencies` or `peerDependencies`, not only
in `devDependencies`.

## Dependencies versus devDependencies

Use `dependencies` when the package is needed by delivered application or
library behavior.

Use `devDependencies` when it is only needed to:

- Type-check.
- Lint.
- Format.
- Test.
- Develop locally.
- Build a package without becoming part of its runtime contract.

Incorrect classification can cause:

- Production failures because a required package was omitted.
- Bloated installations because tooling was marked as runtime code.
- Library consumers receiving duplicate or incompatible frameworks.

## Example from this monorepo

The root `package.json` is private and mainly coordinates tooling. It places
Turborepo, Prettier, and TypeScript in `devDependencies`.

An application such as `apps/auth` places Next.js, React, Auth.js, and Zod in
`dependencies` because they implement the app. ESLint and TypeScript are
development dependencies.

An internal package uses a scoped name such as:

```json
{
  "name": "@workspace/auth",
  "private": true
}
```

The scope groups related packages and prevents naming collisions.

## Cumulative lab — Start the dependency graph

Create a disposable learning project:

```bash
mkdir package-manager-lab
cd package-manager-lab
pnpm init
```

Before running the next command, predict:

- Which file will change?
- Which dependency section will receive the package?
- Will pnpm create a lockfile?
- Where will the package become importable?

Then run:

```bash
pnpm add axios
```

Inspect:

```text
package.json
pnpm-lock.yaml
node_modules
```

Add a small source file:

```js
import axios from "axios"

console.log(typeof axios.get)
```

Explain the result using these three distinct roles:

1. The **package** is `axios`.
2. A **registry or cache** supplies its package content.
3. **pnpm** resolves the graph and makes it available to the project.

## Common mistakes

- Confusing a registry with the package-manager CLI.
- Editing installed code inside `node_modules`.
- Putting every package in `dependencies`.
- Putting a runtime import only in `devDependencies`.
- Removing a lockfile because `package.json` already exists.
- Publishing a workspace package accidentally because `private` was omitted.

## Practice

1. Open the root `package.json` and identify its scripts.
2. Open one app's `package.json`.
3. Classify each dependency as runtime or development tooling.
4. Find one internal `@workspace/*` dependency.
5. Explain why the app is deployable but the internal package is not.

## Level summary

- A package is a versioned, reusable software unit.
- A registry stores packages; a package manager resolves and installs them.
- `package.json` declares package metadata, scripts, and dependency ranges.
- `dependencies` support delivered behavior.
- `devDependencies` support development and build workflows.

[Back to the course roadmap](course-roadmap.md) ·
[Next: Level 2 — Versions](2-versions.md)

## Your first challenge

Without searching Google, explain what you think happens when you run:

```bash
pnpm add axios
```

Use this flow to guide your answer:

```text
You
 │
 │ pnpm add axios
 ↓
pnpm
 │
 │ 1. Find axios
 ↓
Registry
 │
 │ 2. Return axios metadata/package
 ↓
pnpm
 │
 ├── 3. Resolve axios's dependencies
 │
 ├── 4. Choose concrete versions
 │
 ├── 5. Update package.json
 │
 ├── 6. Update pnpm-lock.yaml
 │
 └── 7. Install/link packages
        ↓
   node_modules
```
