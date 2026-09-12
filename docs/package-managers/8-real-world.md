# Level 8 — Real World

## Learning goals

By the end of this level, you should understand:

- How package management fits into CI/CD.
- How private registries and authentication work.
- The main software supply-chain risks.
- How to update dependencies safely.
- Which standards a team should document and enforce.

## 1. Package management in CI/CD

Continuous Integration validates every proposed change in a clean,
repeatable environment. Continuous Delivery or Deployment produces and
releases verified artifacts.

Package management is the first dependency of both processes.

### Typical CI flow

```text
Checkout source
      ↓
Install selected Node.js and pnpm versions
      ↓
Restore pnpm store cache
      ↓
pnpm install --frozen-lockfile
      ↓
Type-check, lint, and test
      ↓
Build applications and packages
      ↓
Publish artifacts or deploy
```

### Frozen installation

```bash
pnpm install --frozen-lockfile
```

CI should fail when manifests and the lockfile disagree. It should not
silently update dependency resolution.

### Cache the store, not `node_modules`

Caching pnpm's store can avoid repeated downloads. Restoring a generated
`node_modules` directory across incompatible systems or tool versions is
more fragile.

Cache keys should consider:

- Operating system.
- Node.js version when relevant.
- pnpm version.
- `pnpm-lock.yaml` hash.

The cache is a performance optimization. CI must still succeed from an empty
cache.

### Example CI steps

```yaml
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
    with:
      version: 10.33.4
  - uses: actions/setup-node@v4
    with:
      node-version: 20
      cache: pnpm
  - run: pnpm install --frozen-lockfile
  - run: pnpm typecheck
  - run: pnpm lint
  - run: pnpm test
  - run: pnpm build
```

This repository does not currently define a `test` script, so this is a
target workflow rather than a copy-paste-ready project workflow.

### Monorepo CI

Small repositories can validate everything. As the repository grows, task
runners can execute only affected packages and their dependents.

Do not optimize too early by skipping important checks. Authentication,
shared UI, and configuration package changes can affect every app.

### Build once, deploy the verified artifact

Avoid rebuilding with different dependencies after tests pass. Ideally:

1. CI installs one locked graph.
2. CI builds an immutable artifact.
3. The same artifact moves through environments.

Rebuilding during deployment can introduce environment drift.

## 2. Private packages

Private packages are available only to authorized users or systems.

They can live in:

- A private scope on the npm registry.
- GitHub Packages.
- An enterprise artifact registry.
- A cloud-provider registry.
- A self-hosted registry.

Workspace packages marked `private: true` do not need a registry when every
consumer lives in the same monorepo.

### Scoped packages

```text
@company/auth
@company/ui
```

A scope groups packages and can map to a registry:

```ini
@company:registry=https://registry.example.com
```

### Registry authentication

CI normally receives a short-lived or protected token through its secret
manager.

An `.npmrc` may reference an environment variable:

```ini
//registry.example.com/:_authToken=${NPM_TOKEN}
```

Commit the variable reference only. Never commit the token value.

### Least privilege

Use separate permissions for:

- Reading private packages.
- Publishing packages.
- Administration.

Build jobs normally need read access. Only a protected release job should
receive publish access.

### Token hygiene

- Prefer short-lived or federated credentials.
- Rotate long-lived tokens.
- Do not print tokens in logs.
- Mask secrets in CI.
- Revoke credentials when a developer or integration no longer needs them.
- Restrict tokens by package scope and environment.

### Private does not mean secure

A private package can still contain vulnerabilities, malicious code, or
accidentally published secrets. Apply the same review, scanning, and
artifact controls used for public packages.

## 3. Package security

Dependency security is a software supply-chain responsibility.

### Threats

Common risks include:

- Known vulnerabilities.
- Malicious maintainers or compromised publisher accounts.
- Typo-squatting package names.
- Dependency confusion between private and public registries.
- Malicious installation scripts.
- Abandoned packages.
- Compromised lockfile changes.
- Secrets included in published archives.

### Evaluate before adding a dependency

Review:

- Correct package name.
- Publisher and repository.
- Release history.
- Maintenance activity.
- License.
- Number and quality of dependencies.
- Installation scripts.
- Bundle/runtime cost.
- Existing security advisories.
- Whether a small local implementation is safer.

Popularity is not proof of security.

### Lockfile integrity

Lockfiles commonly record integrity hashes. Review lockfile changes because
they reveal:

- New packages.
- New versions.
- Peer variants.
- Unexpected registry locations.
- Large transitive graph expansion.

Do not hide an unexplained lockfile rewrite inside an unrelated change.

### Installation scripts

Lifecycle scripts execute code during installation. Native packages may need
them legitimately, but they increase risk.

pnpm can require explicit approval for dependency build scripts. This
repository uses an `allowBuilds` policy in `pnpm-workspace.yaml`.

Review a package before authorizing its script.

### Auditing

Package-manager audit commands can identify known advisories:

```bash
pnpm audit
```

Audits are useful but incomplete:

- A report may contain false positives.
- A package can be unsafe without a published advisory.
- A vulnerable path may or may not be reachable.
- A clean report does not prove security.

Evaluate severity, exploitability, runtime reachability, and available fixes.

### Responding to a vulnerability

1. Identify whether the package is direct or transitive.
2. Determine whether vulnerable code is used and reachable.
3. Upgrade the direct dependency when possible.
4. Use a tested temporary override if necessary.
5. Run all quality and security checks.
6. Deploy the patched artifact.
7. Remove temporary overrides after upstream resolution.
8. Document the decision.

### Dependency confusion

If an internal package name can also resolve from a public registry, an
attacker may publish that name publicly.

Mitigations:

- Use private scopes.
- Configure scope-to-registry mapping.
- Use `workspace:` for required local packages.
- Control registry fallback.
- Reserve important package names.

## 4. Dependency updates

Updates deliver fixes and features but can also introduce regressions.

### Update continuously

Very large, infrequent updates are difficult to review. Prefer small,
regular dependency changes.

Useful categories:

- Patch updates.
- Minor updates.
- Major framework migrations.
- Security updates.
- Tooling-only updates.

Keep unrelated categories in separate pull requests when possible.

### Review available updates

```bash
pnpm outdated
```

Trace an affected package:

```bash
pnpm why package-name
```

### Read release information

Before a significant update, read:

- Changelog.
- Release notes.
- Migration guide.
- Deprecation notices.
- Supported Node.js and framework versions.
- Open regressions when risk is high.

### Update workflow

1. Start from a clean branch.
2. Update a focused package or package group.
3. Review `package.json` changes.
4. Review the lockfile graph.
5. Run type-checking and linting.
6. Run unit and integration tests.
7. Build production artifacts.
8. Test critical runtime flows.
9. Record migration decisions.

For authentication upgrades, test:

- Cookie names and options.
- Session encryption/decryption.
- Login and logout.
- Expiry.
- Cross-subdomain behavior.
- Redirect validation.

### Automated update tools

Dependabot and Renovate can open update pull requests. They reduce discovery
work but do not replace review and testing.

Configure them to:

- Group low-risk related packages.
- Separate major updates.
- Limit pull-request noise.
- Follow a schedule.
- Run full CI.
- Avoid automatic merging of security-sensitive framework changes without
  review.

### Pinning strategy

Possible strategies:

- Exact versions for critical or unstable dependencies.
- Compatible ranges plus a committed lockfile for routine packages.
- Narrow peer ranges based on tested compatibility.
- Automated pull requests for controlled updates.

The correct strategy depends on the risk and release process.

## 5. Team standards

Package management becomes reliable when expectations are documented and
enforced.

### Package manager and runtime

Define:

- Required package manager and exact version.
- Supported Node.js version.
- Approved registries.
- One committed lockfile.

This repository declares pnpm in the root `packageManager` field.

### Dependency ownership

Require developers to:

- Add dependencies only to the consuming workspace.
- Explain why a new package is needed.
- Check license and security.
- Avoid undeclared transitive imports.
- Remove unused dependencies.
- Document overrides.

### App and package boundaries

Define:

- Apps own routes, deployments, and business workflows.
- Packages own stable reusable contracts.
- Packages cannot import app internals.
- Sibling apps cannot import one another.
- Server-only packages must stay out of client bundles.

### Script conventions

Use consistent names:

```text
dev
build
typecheck
lint
format
test
```

Common names let Turborepo and CI apply one task across workspaces.

### Review standards

A dependency pull request should include:

- Reason for addition or update.
- Direct and relevant transitive impact.
- License/security considerations.
- Lockfile review.
- Test and build evidence.
- Migration or rollback notes for high-risk changes.

### Override standard

Every override should have:

- An owner.
- A reason.
- An upstream issue or advisory.
- Compatibility evidence.
- A removal condition.

### Publishing standard

For published packages:

- Release only from protected CI.
- Require clean, reviewed source.
- Build from a frozen lockfile.
- Inspect package contents.
- Generate a changelog.
- Use least-privilege credentials.
- Prefer provenance/signing capabilities supported by the registry.

### Documentation standard

Each shared package should document:

- Purpose and owner.
- Public exports.
- Installation and usage.
- Runtime/client/server constraints.
- Dependency and peer expectations.
- Compatibility and release policy.

## 6. Suggested policy for this monorepo

### Required

- Use pnpm 10.33.4.
- Use Node.js 20 or a repository-approved newer compatible version.
- Commit `pnpm-lock.yaml`.
- Use `workspace:*` for private internal packages.
- Use frozen installs in CI.
- Run type-check, lint, tests, and builds before merge.
- Keep `.env.local` and tokens out of Git.
- Review every dependency installation script.

### Architectural

- Apps depend on shared packages, never sibling apps.
- Credentials remain in the auth app.
- Server-only auth utilities never enter Client Components.
- New services require a review before joining the shared-cookie trust
  boundary.
- Future API handlers authenticate and authorize explicitly.

### Release

- Separate dependency-only changes from product features.
- Do not auto-merge major Next.js, React, or Auth.js updates.
- Verify cross-subdomain authentication after Auth.js upgrades.
- Remove obsolete overrides promptly.

## 7. Incident response example

Suppose a critical vulnerability is reported in a transitive package.

### Investigate

```bash
pnpm why vulnerable-package
pnpm audit
```

### Decide

- Is it used in production?
- Is the vulnerable function reachable?
- Which direct dependency introduces it?
- Is a compatible fixed version available?

### Remediate

- Upgrade the direct dependency.
- If blocked, add a narrow tested override.
- Run all checks and critical integration flows.
- Deploy and verify.

### Follow up

- Remove the override when upstream catches up.
- Document impact and timeline.
- Improve automated detection if the issue was found late.

### Cumulative lab — Handle an automated security update

Use a hypothetical Renovate or Dependabot pull request against
`package-manager-lab`:

1. Read the advisory and identify the affected version range.
2. Run:

   ```bash
   pnpm why vulnerable-package
   pnpm audit
   ```

3. Decide whether the package is direct, transitive, development-only, and
   reachable in delivered behavior.
4. Prefer updating the direct parent package.
5. If no compatible parent release exists, draft a narrow override with:
   - Advisory or issue reference.
   - Compatibility evidence.
   - Owner.
   - Removal condition.
6. Run a frozen install, type-check, lint, tests, and build in a clean CI-like
   environment.
7. Explain why passing `pnpm audit` alone would not prove the update safe.
8. Simulate the upstream fix and remove the temporary override.

The final deliverable is a short incident note describing the dependency
path, risk decision, verification, and follow-up—not only a green command.

## 8. Course capstone

Use this repository to complete the following:

1. Draw the complete workspace dependency graph.
2. Explain one runtime, development, peer, and transitive dependency.
3. Trace a package from manifest range to lockfile and pnpm store.
4. Run a frozen installation in a clean environment.
5. Design CI checks for the monorepo.
6. Draft a policy for private package registry access.
7. Review one dependency as if proposing it to the team.
8. Design a safe update plan for Auth.js or Next.js.
9. Create a small private workspace package with explicit exports.
10. Explain when that package should or should not be published.

## Common mistakes

- Treating a successful audit as proof that dependencies are safe.
- Giving publish tokens to every CI job.
- Caching generated dependencies without correct cache keys.
- Letting CI change the lockfile.
- Auto-merging major framework updates without runtime tests.
- Leaving overrides with no owner or removal plan.
- Publishing from an unreviewed local working tree.
- Adding a new service to a shared auth boundary without security review.

## Level summary

- CI must install from committed, frozen dependency inputs.
- Private registries require least-privilege secret management.
- Dependency security includes publishers, scripts, registries, and
  lockfiles—not only known CVEs.
- Small regular updates are safer than rare large migrations.
- Team standards turn package-manager behavior into an enforceable
  engineering contract.

[Previous: Level 7 — Package Authoring](7-package-authoring.md) ·
[Back to the course roadmap](course-roadmap.md)
