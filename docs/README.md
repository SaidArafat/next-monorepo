# Platform documentation

This documentation describes the platform that exists in this repository
today. It separates implemented foundations from planned product work so it
can be used for engineering decisions and external presentations without
overstating the current scope.

## Current scope

The repository currently provides:

- A centralized authentication BFF and shared subdomain session.
- Independently runnable DMS and infrastructure applications.
- English and Arabic routing with required locale prefixes.
- Shared internationalization, UI, linting, and TypeScript packages.
- Local canonical subdomains that model the intended deployment shape.

The DMS and infrastructure applications are currently authenticated,
localized starter shells. Their domain-specific business workflows have not
yet been implemented.

## Documents

- [Architecture overview](architecture/overview.md): system boundaries,
  repository layout, service relationships, package rules, and deployment
  model.
- [Authentication architecture](architecture/authentication.md):
  authentication types, the implemented login/session flow, authorization
  helpers, security controls, and known limitations.
- [Feature inventory](features.md): implemented capabilities, incomplete
  areas, operational notes, and recommended next steps.
- [Presentation guide](presentation.md): a 20-minute slide outline, speaker
  notes, demo sequence, and likely audience questions.

## Reading paths

For a product or leadership review:

1. Read the current scope above.
2. Read “System at a glance” in the architecture overview.
3. Review the feature inventory.
4. Use the presentation guide.

For an engineering review:

1. Read the complete architecture overview.
2. Read the authentication architecture and trust-boundary notes.
3. Review incomplete controls and recommended next steps in the feature
   inventory.

## Terminology

- **App/service**: an independently runnable and deployable Next.js
  application under `apps/`.
- **Package**: reusable source, policy, configuration, or UI under
  `packages/`; it is not deployed by itself.
- **BFF**: Backend for Frontend. The auth app accepts browser login requests
  and communicates with the external authentication API server-side.
- **SSO**: Single Sign-On. One login creates a session accepted by trusted
  sibling applications.
- **Authentication**: proving who the user is.
- **Authorization**: deciding what an authenticated user is allowed to do.
