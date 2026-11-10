# Changelog

## 0.4.0 — 2026-11-10

It supersedes the unpublished 0.3.0, whose notes follow.

- Single-file components: each component is one `components/<name>.portal` file holding its props (`<props>`), template, CSS (`<style>`) and optional event handlers (`<server>`). The `.html` + `.json` pairs and `styles/components.css` are gone. Copying a component copies its CSS too.
- `ui:` and `t:` are implicit in `.portal` files; examples drop their `xmlns` declarations.
- Per-page CSS: the host inlines the base stylesheet (tokens, shared foundations, icons, layouts) and only the CSS of the components a page shows, including markup that carries a component's root class. Every selector in a component's `<style>` starts with its root class. `styles/layouts.css` is now part of the bundle.
- Component events: `t:click`, `t:submit`, `t:change` with `t:live`, bound to typed exports (`function exports.name(props: Props, input: { … }): ComponentResult`). Pure by default; `security="privileged"` gives exports `ctx`. Props travel in a sealed, visitor-bound token.
- New `buy-now` (privileged): a quantity and a Buy now button whose `submit` asks the site's `lib/checkout.lua` for a checkout and redirects to it; we recommend Stripe hosted Checkout.
- `basket-line` gains `line` (with Update and Remove, handled by the site's `lib/basket.lua`) and the `quantityLabel`, `updateLabel` and `removeLabel` props; it is now privileged.
- `estimate-panel` gains `unitPrice` and `currency`: a `quantity` control inside the panel re-estimates the total live (a pure export).
- The skeleton animation is renamed `portal-skeleton-pulse`, after its component.
- Studio's pill-shaped buttons, button links and nav links are written with `:where()`, so an author rule of the same specificity wins.

## 0.3.0 — Unreleased (superseded by 0.4.0)

- Token model: five knobs (`--portal-brand`, `--portal-radius`, `--portal-font`, `--portal-font-heading`, `--portal-density`), semantic tokens set by three presets (Neutral, Editorial, Studio) in light and dark. Derived states are computed where used, so nested brand overrides work. Old token names are removed without aliases.
- Bundled Inter, Fraunces and Plus Jakarta Sans (SIL OFL) and 40 Lucide icons (ISC) drawn as CSS masks.
- New components: icon, site-header, nav-link, site-footer, page-header, section, hero; product-card, media, price, option-cards, option-card, quantity-input, basket-line, order-summary; dialog, menu, menu-item, popover, tabs, tab-panel; timeline, timeline-step, description-list, description-item, stat, estimate-panel, file-list, file-item; code-block, endpoint, property-table, key-display; avatar, kbd. Badge gains `dot`.
- Four page examples replace the old recipes: print shop, private ordering portal, job tracking and API reference.
- The bundled stylesheet is minified at bundle time and must stay within 64 KiB, because the host inlines it into every page. The host inlines only the icon rules a page uses.
- Font URLs carry the library version (`/_portal/fonts/0.3.0/<file>`), so the host can cache them as immutable.
- Preset and dark-mode selectors are `.portal-theme:where(…)`, so an author class rule such as `.portal-theme.my-brand` wins in every preset and mode.
- Browsers without CSS relative colour get white (or `--portal-primary-content`) button text and `color-mix()` hover and pressed states.
- `code-block` and `key-display` gain `copiedMessage`, a localisable copy confirmation.

## 0.2.0

- Replace verbose component/prop elements with `ui:NAME`, literal attributes and typed `t:bind-PROP`. Named fills and template outlets use `ui:fill` and `ui:outlet`.
- Migrate all component templates, 28 examples and authoring references. Old component syntax is rejected; migrate and republish existing sites.


## 0.1.1

- Expanded semantic colour pairs, typography, border, focus, shadow and density tokens.
- Components consume theme tokens rather than fixed weights, sizes and border widths.
- Browser assertions verify custom root and per-component overrides.

## 0.1.0

- Initial native DataXML component library, token themes, ownable overrides and generated authoring reference.
- Static showcase built from production Swift-rendered examples.
- Portal component contract 1; no package-registry publication requirement.

### Unreleased

- Four actual-renderer page recipes: sign-in, print catalogue, order tracking and order request.
- Theme-aware full-page previews, mobile width controls, copyable DataXML/CSS and integration guidance.
- Layout provenance, browser accessibility checks and Swift renderer regression fixtures alongside component examples.
