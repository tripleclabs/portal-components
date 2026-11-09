# Provenance

The templates, contracts, CSS, documentation and build scripts in this repository were created for Portal Components and are distributed under the MIT license in LICENSE. They are not copied from shadcn/ui or daisyUI; those projects inspired the ownable-source and theme-token product model.

The initial examples in rendered/ were generated using the production Swift PortalSiteKit renderer. The manifest identifies their renderer fingerprint. Future reviewed HTML fixtures can instead use previewRevision; these are explicitly expected output, not a claim of Swift execution. Public builds validate fixture hashes with public Node tools only. The consuming platform owns production renderer compatibility tests. No public build fetches, calls, or depends on platform.

Playwright and axe-core are development-only dependencies, pinned in package-lock.json. Their source is not bundled into the component library or the deployed component example pages. Browser tests load axe-core only while auditing local generated examples.

The static documentation site uses self-hosted fonts and local assets. It contains no external analytics, customer data, credentials or required third-party hosted resources.

## Public distribution boundary

The production compiler and server implementation are not distributed here. Rendered HTML is static synthetic output; its manifest contains relative library paths, hashes and version metadata, not embedded server source. Public Node scripts build documentation and run tests only. The standalone repository excludes node_modules, generated site output, Git metadata and build caches; it includes only the explicitly reviewed public library, documentation, examples, render artifacts and tooling.

## Documentation branding

The docs shell uses official CoCoCo artwork and self-hosted Sofia Sans fonts. See [brand asset provenance and license scope](brand/NOTICE.md). Font binaries are presentation assets, not server code; the brand folder contains only reviewed public assets.

The docs build pre-highlights XML/DataXML, CSS and JSON with Highlight.js. The same escaped renderer highlights live theme exports. Its BSD license is preserved in [third-party credits](docs/third-party.md); the browser bundle contains only public dependencies and docs code.
