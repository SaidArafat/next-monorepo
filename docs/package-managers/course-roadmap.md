# Package Managers Course Roadmap

A progressive path from foundations to real-world package management.
Open a level heading to read its complete lesson, examples, common mistakes,
practice tasks, and summary.

## How to study this course

Use the same learning loop in every level:

1. Learn the mental model.
2. Predict what a command will do.
3. Run a small terminal experiment.
4. Inspect the manifest, lockfile, and dependency graph.
5. Break one controlled thing.
6. Diagnose it before applying a fix.
7. Explain the result in your own words.

For the exercises, create a separate `package-manager-lab` directory outside
this production repository. Start with one package, then evolve it into a
small pnpm workspace as the levels progress.

---

## [Level 1 — Foundations](1-foundations.md)

- What is a package?
- Registry vs Package Manager
- package.json
- dependencies
- devDependencies

---

## [Level 2 — Versions](2-versions.md)

- SemVer
- Version ranges
- Dependency resolution
- Lockfiles

---

## [Level 3 — Installation](3-installation.md)

- node_modules
- npm
- yarn
- pnpm
- pnpm store

---

## [Level 4 — Dependency Graph](4-dependency-graph.md)

- Direct dependencies
- Transitive dependencies
- Peer dependencies
- Optional dependencies
- Conflicts

---

## [Level 5 — Professional Usage](5-professional-usage.md)

- npm / pnpm commands
- `npx` / `pnpm dlx`
- Scripts
- Overrides
- Reproducible installs

---

## [Level 6 — Monorepos](6-monorepos.md)

- Workspaces
- `workspace:*`
- Shared packages
- Internal dependencies
- pnpm architecture

---

## [Level 7 — Package Authoring](7-package-authoring.md)

- Build a package
- `exports`
- Types
- Publishing
- Versioning

---

## [Level 8 — Real World](8-real-world.md)

- CI/CD
- Private packages
- Security
- Dependency updates
- Team standards
