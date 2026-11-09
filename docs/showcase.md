# Showcase and release pipeline

The static documentation is an explorer, not an alternative Portal runtime. Each component page includes the actual Swift-rendered output in a separate-document iframe preview, exact source, props/slots and accessibility notes. The default examples contain no private customer data or Lua business calls.

1. Edit component source/contracts and examples in platform’s authoritative `packages/portal-components` directory. This public repository is a generated mirror.
2. Run the platform's `portal-showcase-render` executable against this package. It compiles and renders with production PortalSiteKit, producing `rendered/*.html` and `rendered/manifest.json`.
3. Run `npm run docs`, `npm run check`, `npm test`, and `npm run build`.
4. Run browser checks against the built site; inspect normal/dark/branded themes and mobile presentation.
5. Review the source and generated HTML diff, export the allowlisted public files and publish the mirror after validation.
6. Update platform’s public commit/checksum pin, regenerate its runtime resources and consumer test fixtures from that pin, and run production compatibility tests. Authoring changes never silently alter the runtime bundle.

The manifest records every render input's SHA-256 and rendered file hashes. Public validation refuses stale or missing output. Private platform CI must additionally re-render and compare: hashes establish correspondence to recorded inputs, not proof that a maliciously changed renderer output is correct.

The public build needs Node only; it does not clone private Swift dependencies. A future public compiler binary can replace this split. Do not implement a JavaScript substitute renderer to bypass it.

`npm run build` writes `site/`. All internal links are relative, so the site works under GitHub Pages' repository prefix. The workflow deploys that folder only. Configuring the actual GitHub repository and Pages environment is a release step, not a side effect of the build.

Example iframes are titled and use static local assets. The documentation's theme/copy controls are trusted site tooling; they do not imply arbitrary scripts are permitted in PortalSite source. Native form submissions in examples are disabled or harmless; executing real actions requires an instance and visitor identity.

## Mobile navigation and theme exploration

On a phone, use **Components** in the header to open the searchable component
navigation. Escape closes it and returns focus to the button. Without JavaScript,
the navigation remains visible.

[Build a theme](https://tripleclabs.github.io/portal-components/theme.html) edits all
published tokens against real rendered examples. Choose a starting palette, edit
values or colour swatches, and use **Apply to site** to explore the documentation
and component previews together. The preview stays visible while editing on mobile.
**Copy CSS** exports the complete base palette plus overrides, ready for
`.portal-theme.my-theme` after the bundled styles.

The docs default to **System**, following OS light/dark changes for both the page
and preview documents. Explicit Light, Dark, Atelier or My theme selections take
precedence until System is chosen again. Theme drafts and selections are stored
only in this browser's local storage; they are never uploaded. Reset editor and
Reset site theme are separate actions. Invalid values are not applied or exported.
Storage-unavailable browsers can still preview and export on the current page.

## Page examples

**Examples** in the header opens four full-page recipes: sign-in, print catalogue,
order tracking and order request. The same links are available in mobile navigation.
Each page offers responsive/mobile preview widths, the site's active theme, full
DataXML source, shared layout CSS and explicit integration notes. These layouts
are rendered by the same Swift pipeline as individual components and included in
its manifest and regression fixture. They add no second rendering implementation.

The sign-in layout never submits credentials. All business buttons stay disabled;
filtering, pricing, authentication, upload and ordering require real Portal flows.
Native disclosures and form controls still work as presentation examples. See
[complete recipes](layouts.md) for copyable source and implementation guidance.

Responsive regression checks cover 320, 375, 390, 701, 768, 800, 1024 and 1440
CSS-pixel viewports for each complete page, both standalone and embedded in the
docs. They check the responsive and mobile preview modes, control containment,
clipping ancestors, toolbar bounds and keyboard access to overflowing tables.
Standalone pages are also checked with JavaScript disabled and 200% root text
size at 320, 768 and 1440 pixels. This is a text-size/reflow test, not a claim of
native browser-menu zoom automation. Screenshots and the matrix report are
written to `site/responsive/` by `npm run test:browser`.
