# Showcase and release pipeline

The static documentation is an explorer, not an alternative Portal runtime. Each component page includes the actual Swift-rendered output in a separate-document iframe preview, exact source, props/slots and accessibility notes. The default examples contain no private customer data or Lua business calls.

1. Edit component source/contracts and examples.
2. Run the platform's `portal-showcase-render` executable against this package. It compiles and renders with production PortalSiteKit, producing `rendered/*.html` and `rendered/manifest.json`.
3. Run `npm run docs`, `npm run check`, `npm test`, and `npm run build`.
4. Run browser checks against the built site; inspect normal/dark/branded themes and mobile presentation.
5. Review the source and generated HTML diff. Publish only after independent contract, accessibility and LLM-authoring review.

The manifest records every render input's SHA-256 and rendered file hashes. Public validation refuses stale or missing output. Private platform CI must additionally re-render and compare: hashes establish correspondence to recorded inputs, not proof that a maliciously changed renderer output is correct.

The public build needs Node only; it does not clone private Swift dependencies. A future public compiler binary can replace this split. Do not implement a JavaScript substitute renderer to bypass it.

`npm run build` writes `site/`. All internal links are relative, so the site works under GitHub Pages' repository prefix. The workflow deploys that folder only. Configuring the actual GitHub repository and Pages environment is a release step, not a side effect of the build.

Example iframes are titled and use static local assets. The documentation's theme/copy controls are trusted site tooling; they do not imply arbitrary scripts are permitted in PortalSite source. Native form submissions in examples are disabled or harmless; executing real actions requires an instance and visitor identity.
