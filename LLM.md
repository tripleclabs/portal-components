# Authoring with Portal Components

Read `docs/authoring.md` and `docs/components.md` before generating a page. `catalogue.generated.json` is the machine-readable source of valid props, types, enums, slots and exact working usage. `llms-full.txt` combines the maintained instructions/reference for one-context consumption.

## Hard rules

1. Write XML-shaped HTML. In a `.portal` file `ui:` and `t:` are implicit; a plain `.html` page declares `xmlns:ui="urn:cococo:ui"` and `xmlns:t="urn:cococo:dataxml"` on its root. Close void elements in source: `<input/>`.
2. Invoke `<ui:button variant="secondary" t:bind-disabled="input.disabled">`. Literal attributes supply strings; `t:bind-PROP` supplies a typed DataXML expression. No JavaScript expressions, Vue bindings or prop child elements.
3. Unnamed children fill the default slot. Named content uses `<ui:fill name="footer">`. Templates use `<ui:outlet/>`. Caller slots keep caller scope; component internals only receive `props`, slot-presence flags and `component.id`.
4. Only use declared props and slots. Names/enum values are exact and case-sensitive, including camelCase props. Use `t:bind-disabled="true"` / `"false"` for boolean constants and `t:bind-value="65"` for a numeric prop. Literal `disabled="true"` is a string and fails a boolean contract. Use `key` or `t:bind-key` for component identity, not a prop. The old portal-component/portal-prop/portal-fill/portal-outlet syntax is rejected.
5. Components render purely: they never fetch while rendering. Keep page data in page Lua and page forms. A component may handle its own events with `t:click` (on a `<button>`), `<form t:submit>` or `t:change` plus `t:live`, bound to typed exports in its `<server>` block; see "Component events" in `docs/authoring.md`. No `<script>`, onclick, client Lua or arbitrary networking.
6. Use real HTML labels, control ids, names and native form semantics. Set button type=submit intentionally. Provide unique ids for repeated controls, and match `for`/`describedby` exactly.
7. Internal URLs use the standard Portal mount-aware helpers/HTML handling. Do not hardcode a staff-preview prefix.
8. Brand with documented `--portal-*` variables (see "Theming" below). To change a component copy its whole `components/<name>.portal` file locally (props, template and style); do not edit the host bundle. Every selector in a component's `<style>` starts with its root class.
9. Do not infer upload, sorting, client state or combobox functionality from visual markup. Dialog, tabs, quantity and copy work only through the runtime behaviours their components emit; menu and popover use native popovers. Read each component's limits.
10. `t:if` and ternary conditions are truthiness only: there is no `==`. Branch on booleans or present/absent values, or use the `remove`/`replace` filters to turn a known enum value into an empty string. `data-portal-*` attributes must be static: wrap a component in a page-owned element to make it a region.
11. Use one h1 per page: `hero` and `page-header` each render an h1, so a page uses one or the other, once.
12. Compile the result with the real Portal compiler. A plausible-looking snippet is not evidence it compiles.
13. An export is `function exports.name(props: Props, input: { … }): ComponentResult` and returns `{ render = … }` (the template sees `result`), `{ errors = { { path, message } } }` (the template sees `errors`, status 422) or `{ redirect = "/path" }`; only `security="privileged"` components may redirect to an `https://` URL. `result` and `errors` are nil before any event.
14. Props are trusted (sealed in a visitor-bound token); controls are visitor input checked against the export's input type. Signed call values prove which button was pressed, not that the visitor may act: check ownership in the export or the module it calls. `t:change` exports run on every edit: they should only read.
15. Declaration `type="integer"` describes a value; HTML `<input type="number">` is only a control whose text the export's input type reads. Use `integer` for counts, `number` for prices.
16. Checkout and ordering work through privileged component exports. For buy-it-now use `buy-now` with the site's own `lib/checkout.lua` (its `create({ productId, quantity })` returns `{ url }`, and `submit` redirects there); for basket rows use `basket-line` with `lib/basket.lua`. Recommend Stripe hosted Checkout so card details never reach the portal, price on the server, and confirm payment from the provider's webhook. See "Component events" in `docs/authoring.md`.

## Recommended workflow

Choose components from the catalogue, build the semantic native page first, then connect page Lua and progressive regions. Give a standalone component its `<props>` declaration in the same `.portal` file. Keep fetched view models serializable and keep repeated presentation components free of loaders. Verify native no-JavaScript behavior, errors, empty results, mobile layout and keyboard use.

If an API is missing from this documentation, say so instead of inventing it. Components are not a general Vue-compatible environment.

## Theming

Put `class="portal-theme"` on the page root. Five knobs cover most brands: `--portal-brand` (the only interactive colour; hover, pressed, tint, focus ring and button text are derived from it), `--portal-radius`, `--portal-font`, `--portal-font-heading` and `--portal-density`. Presets set everything else: Neutral (default), `data-preset="editorial"` or `data-preset="studio"`, each with `data-theme="dark"`. `--portal-brand`, `--portal-radius` and `--portal-density` also work on a nested wrapper; the two font knobs take effect on the theme root only. Never invent token names: `docs/tokens.md` lists them all.

```html
<div class="portal-theme" data-preset="studio" style="--portal-brand:#0f766e">…</div>
```

## One example per experience

Start from the page example closest to the request and keep its structure:

| Experience | Example | Built from |
| --- | --- | --- |
| Public print shop | `examples/layout-shop.html` | hero, product-card grid, option-cards, quantity-input, estimate-panel |
| Private B2B ordering portal | `examples/layout-ordering-portal.html` | menu, basket-line reorder list, order-summary, sign-in card |
| Job tracking | `examples/layout-tracking.html` | page-header, timeline, description-list, file-list, table with badges |
| API reference | `examples/layout-api.html` | endpoint, property-table, code-block, tabs, key-display |

## Complete page compositions

Use `docs/layouts.md` for the four page examples above. Each includes full DataXML source and integration notes. The layout CSS ships in the host's bundled stylesheet; theme tokens remain inherited. The showcase layouts are static: fictional content, disabled business actions and no connected sign-in, live estimate or checkout, because the showcase has no Portal behind it. In a real portal wire those actions to protected flows (page actions, or component events such as `estimate-panel`'s live total and `buy-now`'s checkout); never activate them by simply removing `disabled`. Reuse components and native HTML; do not invent client scripts or handler capabilities from a screenshot.
