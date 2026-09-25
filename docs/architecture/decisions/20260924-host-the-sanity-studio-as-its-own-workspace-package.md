# Host the Sanity Studio as its own workspace package

- Status: accepted
- Date: 2026-09-24
- Tags: architecture, public-site, cms, tooling

## Context

The Public Site's content moves to Sanity so that Editors — two or three people, only one of
them technical — can change it without a pull request or a deploy. Sanity needs a Studio, the
editing interface, and it has to live somewhere. The current `sanity` package builds with
Vite 8 and requires React 19.2.2 or later; the app builds with Vite 5. We are on Sanity's free
plan and intend to stay there.

## Decision

The Studio is a separate pnpm workspace package under `studio/`, deployed with `sanity deploy`
to Sanity's own hosting (`*.sanity.studio`). It is not embedded in the app.

The app installs only the read-side packages — `@sanity/client`, `@sanity/image-url`,
`@portabletext/react` — and reaches Sanity from its loaders.

## Consequences

### Positive

- The Studio's toolchain upgrades on its own schedule and never drags the app's Vite or React
  along with it.
- None of the Studio's weight ships with the Platform.
- Hosting and Editor login cost nothing and need no code: Sanity does both.

### Negative

- Two deploy targets. The Studio deploys from CI on merge to `main`, not with the Coolify
  deploy, so a schema change and the code that reads it land at different moments — see
  [Sanity schema changes follow expand/contract](./20260924-sanity-schema-changes-follow-expand-contract.md).
- Editors log in with Sanity accounts, separate from Platform accounts. The free plan offers
  only the Administrator and Viewer roles.
- The repository becomes a pnpm workspace, and every tool that assumed a single package —
  lint, typecheck, the Dockerfile, CI — has to account for `studio/`.

### Neutral

- The Studio still lives in this repository and goes through the same review as the app.

## Alternatives Considered

1. **Embed the Studio in the app at `/admin/cms`**
   - Pros: one deploy; could sit behind the existing admin auth.
   - Cons: ties the app to the Studio's Vite 8 and React requirements; ships the Studio's
     bundle with the Platform; its routing and auth need custom work.

2. **Self-host the built Studio on Coolify**
   - Pros: everything on our own infrastructure.
   - Cons: one more service to configure and keep alive, with no benefit over Sanity's free
     hosting.

## References

- [Sanity Studio deployment](https://www.sanity.io/docs/studio/deployment)
- [Sanity pricing](https://www.sanity.io/pricing)
- [Use React Router 7 with SSR](./20250123-use-react-router-7-with-ssr.md)
