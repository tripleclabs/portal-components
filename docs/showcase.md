# Showcase and release pipeline

The standalone repository owns component source, contracts, examples, expected HTML previews and documentation. It has no platform dependency. Clone this repository and install public npm dependencies to run all its checks and publish the site.

1. Edit components, contracts and DataXML examples here.
2. Update the corresponding expected HTML in `rendered/`; review it alongside the source. These are static fixtures, not a second DataXML renderer.
3. Run `npm run docs` and `npm run previews:record` to record reviewed fixture hashes. This marks the manifest as `reviewed-html-v1`, rather than claiming production renderer provenance.
4. Run `npm run check`, `npm test`, `npm run build` and `npm run test:browser`.
5. Review accessibility, themes, mobile layouts and source/fixture correspondence before publishing.

Public CI checks contracts, reference generation, fixture integrity and browser behavior. It cannot prove DataXML execution matches the fixture. The consuming platform pins a public commit and archive checksum, generates its runtime resources and test fixtures from that pin, and compares every example with its production Swift renderer in **platform CI** before accepting the dependency update.

Platform can also export static HTML and a provenance manifest for maintainers to review and import into `rendered/`. That is an optional artifact transfer, not a build dependency or private-repository workflow trigger. Do not copy Swift/server code here. Existing fixtures retain their actual-renderer provenance until replaced.

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
are included in the preview manifest and consumer integration fixtures. They add
no second rendering implementation.

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
