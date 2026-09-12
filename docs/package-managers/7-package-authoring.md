# Level 7 — Package Authoring

## Learning goals

By the end of this level, you should understand:

- How to structure and build a reusable package.
- How `exports` defines a public API.
- How to ship TypeScript types.
- How package publishing works.
- How to version packages responsibly.

## 1. Build a package

A package is a product for developers. Its consumers need:

- Stable import paths.
- Runtime-compatible JavaScript.
- Type declarations when using TypeScript.
- Correct dependency metadata.
- Documentation and release notes.

### Source-only workspace package

This monorepo currently consumes TypeScript package source directly:

```json
{
  "name": "@workspace/auth",
  "private": true,
  "exports": {
    "./session": "./src/session.ts"
  }
}
```

Next.js transpiles the package as part of each consuming app build.

This is efficient for a private monorepo, but it assumes consumers can
compile the source format.

### Built package

A package intended for external consumers normally produces a `dist`
directory:

```text
my-package/
├── src/
│   ├── index.ts
│   └── feature.ts
├── dist/
│   ├── index.js
│   ├── index.d.ts
│   ├── feature.js
│   └── feature.d.ts
├── package.json
└── tsconfig.json
```

The package manifest points consumers to built output rather than source.

### Basic TypeScript build

Example `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "rootDir": "src",
    "outDir": "dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true
  },
  "include": ["src"]
}
```

Example script:

```json
{
  "scripts": {
    "clean": "node scripts/clean.mjs",
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit"
  }
}
```

Some packages need a bundler instead of plain TypeScript compilation.
Choose based on:

- Supported runtimes.
- ESM and CommonJS requirements.
- Tree-shaking needs.
- Whether dependencies should remain external.
- Browser versus Node.js targets.

### Build inputs and outputs

Document:

- Source directory.
- Generated output directory.
- Runtime module format.
- Type output.
- Minimum runtime versions.
- External dependencies.

Generated `dist` output is often ignored in the repository but included in
the published package. The exact policy depends on release tooling.

### Validate the package artifact

Before publishing:

```bash
pnpm build
pnpm pack
```

Inspect the resulting archive. Verify that it contains:

- Required JavaScript.
- Type declarations.
- `package.json`.
- README and license.

It must not contain:

- Secrets.
- `.env.local`.
- Tests or fixtures unless intentionally shipped.
- Unnecessary source maps containing private paths or source.
- Entire monorepo directories.

## 2. The `exports` field

`exports` defines the public import paths of a package.

```json
{
  "name": "@example/toolkit",
  "exports": {
    ".": "./dist/index.js",
    "./feature": "./dist/feature.js"
  }
}
```

Consumers can import:

```ts
import { main } from "@example/toolkit"
import { feature } from "@example/toolkit/feature"
```

They cannot rely on an unexported internal path:

```ts
// Intentionally unsupported
import helper from "@example/toolkit/dist/internal/helper.js"
```

### Why export maps matter

They:

- Define a stable public API.
- Hide implementation details.
- Permit internal refactoring.
- Support different runtime conditions.
- Prevent accidental deep imports.

### Root and subpath exports

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./server": "./dist/server.js",
    "./client": "./dist/client.js"
  }
}
```

Subpaths are useful when:

- Server and client code must remain separate.
- Importing the root would load unnecessary code.
- Consumers need a stable feature-level boundary.

Avoid creating dozens of exports that expose the internal directory
structure accidentally.

### Conditional exports

A package can provide different files by environment:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs",
      "default": "./dist/index.js"
    }
  }
}
```

Condition order and runtime support matter. Test every format you claim to
support.

### The `type` field

```json
{
  "type": "module"
}
```

This makes `.js` files in the package ES modules. CommonJS and ESM differ in
syntax and loading behavior.

Do not claim dual ESM/CommonJS support unless both outputs are tested.

### Other entry fields

Older tooling may use:

- `main`
- `module`
- `types`

Modern packages commonly use `exports`, sometimes alongside legacy fields
for compatibility. Understand the consumers before removing older fields.

## 3. Types

TypeScript consumers need declarations describing the package API.

### Generate declarations

```json
{
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": false
  }
}
```

The build produces `.d.ts` files:

```ts
export declare function greet(name: string): string
```

### Publish types with exports

```json
{
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

Every exported runtime subpath should have matching type support.

### Avoid leaking private types

This public function leaks an internal type:

```ts
function load(): InternalDatabaseRecord
```

If the declaration references a type consumers cannot import, their
type-checking fails.

Export a public contract or convert the internal type before returning it.

### Type-only imports

Use:

```ts
import type { User } from "./types.js"
```

when the import exists only for type-checking. This helps avoid accidental
runtime imports.

### Type compatibility is API compatibility

Changing:

```ts
function parse(value: string): Result
```

to:

```ts
function parse(value: URL): Result
```

is a breaking change even if the emitted JavaScript file names stay the
same.

### Test types

At minimum:

- Type-check the package itself.
- Type-check a consumer fixture.
- Verify every export path resolves.
- Test both server and client boundaries where applicable.

## 4. Publishing

Publishing uploads package metadata and an archive to a registry.

### Keep private packages private

```json
{
  "private": true
}
```

This prevents normal accidental publication. Internal source packages in
this repository are private.

### Prepare a public package

A publishable manifest commonly includes:

```json
{
  "name": "@example/toolkit",
  "version": "1.0.0",
  "description": "Reusable example toolkit",
  "license": "MIT",
  "type": "module",
  "files": ["dist", "README.md", "LICENSE"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### The `files` field

`files` is an allowlist for package contents:

```json
{
  "files": ["dist", "README.md", "LICENSE"]
}
```

Use it together with artifact inspection. Do not depend only on `.gitignore`
to control published contents.

### Preview before publishing

```bash
pnpm pack
```

Install the archive in a temporary consumer and test actual imports.

### Publish

```bash
pnpm publish
```

Publishing requires registry authentication and authorization. Scoped public
packages may require explicit public access configuration.

Never publish from a developer machine casually. A controlled CI release
with protected credentials, review, tests, and provenance is safer.

### Registry immutability

Registries generally do not allow replacing the contents of an already
published name and version. If `1.2.3` is wrong, publish a corrected new
version rather than trying to overwrite it.

### Deprecation is not deletion

Deprecating a version warns consumers:

```bash
npm deprecate "@example/toolkit@1.2.3" "Use 1.2.4 instead"
```

Unpublishing can break existing builds and is often restricted.

## 5. Versioning packages

Versioning communicates compatibility to consumers.

### Patch release

Use a patch for backward-compatible fixes:

```text
1.4.2 → 1.4.3
```

### Minor release

Use a minor for backward-compatible features:

```text
1.4.2 → 1.5.0
```

### Major release

Use a major for breaking changes:

```text
1.4.2 → 2.0.0
```

Breaking changes include:

- Removing an export.
- Renaming an import path.
- Changing required parameters incompatibly.
- Dropping a supported runtime.
- Changing important behavior consumers rely on.

### Pre-releases

```text
2.0.0-beta.1
2.0.0-rc.1
```

Pre-releases allow testing before a stable major release. Consumers must opt
into them explicitly.

### Fixed versus independent versions

A monorepo can use:

- **Fixed versioning**: all released packages share one version.
- **Independent versioning**: each package increments based on its own
  changes.

Fixed versions simplify coordinated releases. Independent versions reduce
unnecessary releases but require stronger dependency/release tooling.

### Changelogs

A useful release note explains:

- What changed.
- Why it changed.
- Whether it is breaking.
- How to migrate.
- Which consumers are affected.

Commit messages can help generate changelogs, but maintainers must still
review release semantics.

## Cumulative lab — Build, pack, and consume one package

Turn `packages/utils` in `package-manager-lab` into a built package named
`@lab/utils`.

### Build it

1. Add `src/index.ts` and one `src/format.ts` subpath.
2. Compile JavaScript and declarations into `dist`.
3. Set `"type": "module"`.

### Define the public contract

Connect the relevant manifest fields in one place:

```json
{
  "name": "@lab/utils",
  "version": "1.0.0",
  "type": "module",
  "files": ["dist", "README.md"],
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./format": {
      "types": "./dist/format.d.ts",
      "import": "./dist/format.js"
    }
  },
  "publishConfig": {
    "access": "public"
  }
}
```

If supporting older tools, investigate whether `main`, `module`, or a
top-level `types` field is also necessary. Do not add compatibility fields
without understanding which consumer uses them.

### Inspect it

```bash
pnpm build
pnpm pack
```

Open the archive and verify that:

- Both runtime entries exist.
- Both declaration entries exist.
- Source secrets and unrelated workspace files are absent.
- Every path in `exports` points to a shipped file.

### Consume it

Install the archive into a temporary consumer, then test:

```ts
import { helper } from "@lab/utils"
import { format } from "@lab/utils/format"
```

Type-check and run the consumer. Finally, make one breaking export change
and explain why it requires a major version.

## 6. Package-authoring checklist

### API

- Is every public import path intentional?
- Are internals hidden?
- Are server/client boundaries explicit?
- Are errors and behavior documented?

### Runtime

- Are supported Node.js and browser versions defined?
- Is ESM/CommonJS support accurate?
- Are dependencies correctly classified?
- Are peer ranges tested?

### Types

- Does every export resolve to declarations?
- Do declarations avoid inaccessible private types?
- Has a real consumer been type-checked?

### Artifact

- Does `pnpm pack` contain only required files?
- Are secrets and private sources excluded?
- Are README and license present?

### Release

- Did tests and builds pass from a clean install?
- Is the version increment correct?
- Is the changelog clear?
- Are publishing credentials protected?

## Common mistakes

- Publishing TypeScript source that consumers cannot compile.
- Exposing every internal file through exports.
- Forgetting declarations for subpath exports.
- Shipping secrets or `.env` files.
- Marking a breaking type change as a patch.
- Publishing with an uncommitted or dirty working tree.
- Supporting both ESM and CommonJS without testing both.
- Publishing a workspace package that should remain private.

## Practice

1. Design an export map for a package with root, server, and client entries.
2. Build a small TypeScript package into `dist`.
3. Run `pnpm pack` and inspect the archive.
4. Create a temporary consumer and import each public subpath.
5. Classify three hypothetical changes as patch, minor, or major.
6. Explain why `@workspace/auth` is source-only and private today.

## Level summary

- Build output must match consumer runtime and type needs.
- `exports` is the intentional public API boundary.
- Type declarations are part of API compatibility.
- Inspect package archives before publication.
- Private workspace packages do not need to be published.
- Version changes must communicate consumer impact honestly.

[Previous: Level 6 — Monorepos](6-monorepos.md) ·
[Back to the course roadmap](course-roadmap.md) ·
[Next: Level 8 — Real World](8-real-world.md)
