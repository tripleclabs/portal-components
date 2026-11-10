# Authoring contract

## Props

In a `.portal` file (a page or a component) the `ui:` and `t:` prefixes are implicit. A plain `.html` page declares `xmlns:ui="urn:cococo:ui"` and `xmlns:t="urn:cococo:dataxml"` once, on its root. The samples below assume either. Literal attributes supply string props; `t:bind-PROP` preserves the JSON type of a DataXML expression:

```xml
<ui:button variant="secondary" t:bind-disabled="true">
  Save draft
</ui:button>
```

Dynamic values use the existing DataXML expression evaluator:

```xml
<ui:badge t:bind-variant="data.statusVariant">
  <span t:text="data.statusLabel"/>
</ui:badge>
```

A string, number or boolean stays that type; values are validated before rendering. Defaults apply when a prop is absent. Explicit null is accepted only when declared nullable. Unknown props, invalid types/enums and missing required values are errors. Attribute names match declared props exactly, including camelCase names. Native HTML still uses `t:attr-*`; component props use `t:bind-*`. There is no automatic attribute fallthrough.

## Slots and isolation

Unnamed children fill the default slot. `ui:fill` selects a declared named slot. Content runs in the caller's lexical scope; a child's template sees its own props, `slots.<name>` presence flags and `component.id`, not caller data or credentials. Empty supplied slots suppress fallback content. Named fills are not separate components and cannot fetch data.

A component is one file, `components/<name>.portal`, with up to four top-level blocks: `<props>` declares its props and slots, `<template>` holds its markup (exactly one root, using `ui:outlet`), `<style>` its CSS and `<server>` its event handlers (see Component events). Only `<template>` is required.

```xml
<props>
  <prop name="tone" type="string" default="info" enum="info warning"/>
  <slot name="header"/>
  <slot name="default"/>
</props>

<template>
  <section class="site-note" t:attr-data-tone="props.tone">
    <header t:if="slots.header"><ui:outlet name="header"/></header>
    <ui:outlet name="default"><p>No content supplied.</p></ui:outlet>
  </section>
</template>

<style>
  .site-note { padding: 1rem; }
  .site-note[data-tone="warning"] { border-inline-start: 3px solid var(--portal-warning); }
</style>
```

This illustrates a local custom component, not a replacement for the richer bundled Card. A `<prop>` takes `name`, `type` (`string`, `boolean`, `integer`, `number`, `array`, `object` or `any`), and optionally `required`, `default` (written as text, read by the type), a space-separated `enum`, `nullable` and `description`. An object prop may describe its fields with nested `<prop>` elements, an array its elements with one `<items>`. A required prop has no default. `<slot>` takes `name` and optionally `required`. Unknown slots and duplicate named fills fail validation.

Every selector in `<style>` starts with the component's root class, the first class on its template root (`.site-note`, `.site-note__part`, `.site-note:hover`, `.site-note .child`); `@media`, `@supports` and `@container` may wrap such rules, and a `@keyframes` is named after the root class. The CSS is not rewritten or scoped: the root class is the scope. A page inlines the CSS of the components it uses, after the bundled base and before your own stylesheet, so your CSS wins.

## Native forms

Use a caller-owned form and page-owned action handler. The handler must be declared in the page/site contract; components do not register it implicitly.

```xml
<form data-portal-action="saveContact">
  <ui:field for="customer-email" label="Email address">
    <ui:input id="customer-email" name="email" type="email" autocomplete="email" t:bind-required="true">
    </ui:input>
  </ui:field>
  <ui:button type="submit">
    Save contact
  </ui:button>
</form>
```

The Portal host adds protected action routing and form fences. Server-side authorization and validation remain required. Use a native GET form with an ordinary action for filtering. The showcase can demonstrate native controls but cannot execute an instance's business APIs.

## Component events

A component can handle its own buttons and forms. Bind an event in the template to a function exported from the same file's `<server>` block; the author never writes a form. Exports run only when a visitor triggers the event, never while the component renders: rendering is always pure.

```xml
<props>
  <prop name="line" type="object" required="true">
    <prop name="id" type="string" required="true"/>
  </prop>
</props>

<template>
  <div class="site-line">
    <input type="number" name="quantity" min="1" value="1"/>
    <button t:click="update({ lineId = props.line.id })">Update</button>
    <button t:click="remove({ lineId = props.line.id })">Remove</button>
  </div>
</template>

<server security="privileged"><![CDATA[
function exports.update(props: Props, input: { lineId: string, quantity: integer }): ComponentResult
  if input.quantity < 1 then
    return { errors = { { path = "quantity", message = "Enter at least 1" } } }
  end
  ctx.script.load("basket").update(input.lineId, input.quantity)
  return {}
end

function exports.remove(props: Props, input: { lineId: string }): ComponentResult
  ctx.script.load("basket").remove(input.lineId)
  return {}
end
]]></server>
```

- `t:click="name"` goes on a `<button>` (anything else is a compile error: use a button, for keyboard access and no-JavaScript use). It calls that export with the instance's named controls as `input`. The whole instance behaves as one form.
- `t:click="name({ key = expr, … })"` adds values evaluated at render, for example a row's id inside `t:for`. They are signed into the page, so a visitor cannot swap them; the controls the visitor fills in are added beside them. A call key may not share a control's name, and must be a field of the export's input.
- `<form t:submit="name">` posts a form you write yourself, with Enter-to-submit and native validation. Give it no `action` or `method`.
- `t:change="name"` on the root or a container re-runs that export as the visitor edits a control inside it, and re-renders only the parts marked `t:live="part"` (each part a name, never containing the controls being edited). Without JavaScript there is no live update; a click still posts and the live parts render with the result.
- Event names are static and must be exports of the same file. A page cannot use `t:click`, `t:submit`, `t:change` or `t:live`; they belong to components.

**The server block.** `<server>` holds Lua (wrap it in CDATA when it contains `<` or `&`). Each export is typed: `function exports.name(props: Props, input: { … }): ComponentResult`. `Props` comes from `<props>`; the input type lists the visitor fields the export accepts (strings, numbers, integers, booleans, literal unions, optional fields and arrays of those). Posted values are checked against it before the export runs and undeclared fields are dropped. By default a component is pure: no `ctx`, no modules, just the language. `security="privileged"` gives its exports `ctx` under the visitor's Portal access, as a page handler has, so they can load your site's own modules (`ctx.script.load("checkout")`, a `lib/checkout.lua`). That attribute is the whole consent; read a privileged component before you ship it.

**Results.** An export returns a table:

| Return | Effect |
| --- | --- |
| `{ render = { … } }` | Re-renders the component; its template sees the table as `result` |
| `{ errors = { { path = "quantity", message = "…" } } }` | Re-renders with status 422; the template sees the list as `errors` |
| `{ redirect = "/orders" }` | 303 to a published page of the site |
| `{ redirect = "https://checkout.stripe.com/…" }` | Privileged only: 303 to an absolute `https://` URL, such as a payment provider's hosted checkout. Pure components stay on the site; any other scheme is refused |
| `{}` | Re-renders the page as it now is |

Before any event `result` and `errors` are nil, so guard with `t:if="result"`. Components keep no state between events: a later event sees only its props and its own input, so anything that must persist is a control value or a prop. With JavaScript the runtime swaps just the instance (or, for `t:change`, its live parts); without it the page re-renders whole.

**Trust.** Props are trusted, controls are not. The props a component rendered with travel in a sealed instance token: encrypted, so they are not readable in the page, and bound to the visitor's session, the site version and the Portal, so it cannot be replayed by someone else or after a republish (the visitor reloads instead). An export receives those props, never values posted by the browser. Signing proves which button was pressed, not that the visitor may act on it: an export still checks, for example, that the basket line belongs to this visitor. A host with no token secret, and the static showcase, renders event buttons disabled.

**`t:change` exports should only read.** They run on every edit, with the component's one security level (a privileged component's change export could write). Nothing enforces read-only; keep writes behind `t:click` or `t:submit`.

**Buy now and checkout.** The bundled `buy-now` is privileged: its `submit` export checks the quantity, then calls `ctx.script.load("checkout").create({ productId = …, quantity = … })` and redirects to the `url` it returns. The library is not a shop; `lib/checkout.lua` is yours. We recommend Stripe hosted Checkout, so card details are entered on Stripe's page and never reach your portal:

```lua
-- lib/checkout.lua: the site's checkout, which buy-now calls.
local checkout = {}

function checkout.create(order)
  -- Price on the server from the product id; never trust a price from the page.
  -- Then create a Stripe Checkout Session through the tenant's Stripe
  -- integration, which holds the secret key (Portal Lua never does), with
  --   mode = "payment",
  --   line_items = { { price = <the product's Stripe price>, quantity = order.quantity } },
  --   success_url = "https://shop.example/thanks?session_id={CHECKOUT_SESSION_ID}",
  --   cancel_url = "https://shop.example/basket"
  local session = createStripeCheckoutSession(order) -- your integration's call
  return { url = session.url } -- https://checkout.stripe.com/c/pay/cs_…
end

return checkout
```

Confirm payment from Stripe's webhook, not from the visitor arriving at `success_url`. `basket-line` follows the same pattern with `lib/basket.lua` (`update(lineId, quantity)` and `remove(lineId)`), and must check that the line is the visitor's.

**`integer` is not `type="number"`.** `type="integer"` in a `<prop>` and `integer` in an input type describe the value. `<input type="number">` is only the HTML control, whose value is posted as text; the export's input type decides how it is read, so `2.5` posted to an `integer` field fails validation (422) rather than being rounded.

## IDs, keys and overrides

Pass stable, unique IDs for form controls and association references. A component's internal generated identity does not leak into caller slot scope. Prefer page view models containing precomputed IDs when rendering repeated fields; never reuse one literal id in a loop. Component invocation keys identify repeated siblings; they do not authorize access or replace explicit HTML form IDs.

To override Card, copy `components/card.portal` to your site's same path: its props, markup and style come with it. Local resolution takes precedence. Keep all required slots/props expected by existing callers or change those callers. Rules for classes several components share (choice, table, panel and the like) and the theme foundations stay in the bundled base stylesheet. There is no automatic update merge or CLI installer in v1.

## Frequent errors

| Incorrect | Correct |
| --- | --- |
| `<Button variant="primary">` | `<ui:button variant="primary">…</ui:button>` |
| `:disabled="loading"` | `t:bind-disabled="input.loading"` with a boolean |
| `<template #footer>` | `<ui:fill name="footer">…</ui:fill>` |
| `onclick="save()"` | A page-owned protected native form action |
| `@click="save"` or `v-on:click` in a component | `t:click="save"` on a `<button>`, with `exports.save` in its `<server>` |
| `{{ props.title }}` | `t:text="props.title"` |
| A component reads `data.customer` implicitly | Pass a declared prop from the caller |
| Copy only part of a component | Copy its whole `.portal` file |
| A placeholder used instead of a label | A visible label associated with the input id |

Scoped slots, automatic client hydration and component-owned Lua loaders are not v1 features: a component never fetches while it renders, and its exports run only on its own events. The single-file model leaves room for later extensions without inventing them today.

## Repeated fields with descriptions and errors

Give the page loader a view model containing unique association IDs. For example, `data.lines` can contain:

```json
[
  {"key":"line-42","controlId":"quantity-42","descriptionId":"quantity-42-hint","errorId":"quantity-42-error","describedby":"quantity-42-hint quantity-42-error","quantity":"0","error":"Enter at least 1","invalid":true}
]
```

Use a keyed invocation inside the DataXML loop:

```xml
<section>
  <div t:for="data.lines" t:as="line">
    <ui:field t:bind-key="line.key" t:bind-for="line.controlId" label="Quantity" description="Minimum 1 item" t:bind-descriptionId="line.descriptionId" t:bind-error="line.error" t:bind-errorId="line.errorId">
      <ui:input t:bind-id="line.controlId" t:bind-name="line.controlId" type="number" min="1" t:bind-value="line.quantity" t:bind-invalid="line.invalid" t:bind-describedby="line.describedby">
      </ui:input>
    </ui:field>
  </div>
</section>
```

The caller slot can still read `line`; it cannot read Field's private props. Keep the `describedby` list limited to elements actually rendered: omit the error ID when there is no error. The input value remains a string even when its HTML type is number; validate/coerce native form input on the server. This example deliberately uses unique control names because repeated-name collection behavior belongs to the form handler contract, not the component library.

## Conditions are truthiness only

`t:if`, `t:elseif` and the condition of a `t:attr-*` ternary test truthiness; DataXML has no `==`. Branch on a boolean or on whether a value is present. To branch on a known enum value, filter the others away: `props.state | remove:'done' | remove:'upcoming'` is non-empty only for `current`. Boolean props bound to non-native attributes need a ternary (`props.sticky ? 'true' : null`), because a plain binding renders the string `false`.

## Interactive components

`dialog`, `tabs`, `quantity-input`, `code-block` and `key-display` emit the runtime's trusted behaviours (`data-portal-behavior="dialog|tabs|quantity|copy"`). Their enhancement-only buttons are hidden until the runtime starts, so without JavaScript the native content remains: number inputs stay typeable, tab panels show stacked under their headings, code stays selectable. A dialog's content is hidden without JavaScript, so link to the same content from the page. `menu` and `popover` use native popovers and work without JavaScript.

`data-portal-*` attributes are static markup; templates cannot bind them. To make a component refreshable, wrap it in a page-owned element with `data-portal-region` (outside any component slot) and target that region from a form.

## Migration

The old `portal-component`, `portal-prop`, `portal-fill` and `portal-outlet` syntax is rejected. Rename invocations to `ui:NAME`, move literal props onto attributes, move typed props to `t:bind-PROP`, and rename fills/outlets to `ui:fill`/`ui:outlet`. Use `t:bind-key` for dynamic identity. Republish authored sites after migration; old component-bearing compiled snapshots must be rebuilt. No compatibility alias is provided.
