# Authoring contract

## Props

Declare `xmlns:ui="urn:cococo:ui"` and `xmlns:t="urn:cococo:dataxml"` on the document root. Literal attributes supply string props; `t:bind-PROP` preserves the JSON type of a DataXML expression:

```xml
<ui:button xmlns:t="urn:cococo:dataxml" xmlns:ui="urn:cococo:ui" variant="secondary" t:bind-disabled="true">
  Save draft
</ui:button>
```

Dynamic values use the existing DataXML expression evaluator:

```xml
<ui:badge xmlns:t="urn:cococo:dataxml" xmlns:ui="urn:cococo:ui" t:bind-variant="data.statusVariant">
  <span t:text="data.statusLabel"/>
</ui:badge>
```

A string, number or boolean stays that type; values are validated before rendering. Defaults apply when a prop is absent. Explicit null is accepted only when declared nullable. Unknown props, invalid types/enums and missing required values are errors. Attribute names match declared props exactly, including camelCase names. Native HTML still uses `t:attr-*`; component props use `t:bind-*`. There is no automatic attribute fallthrough.

## Slots and isolation

Unnamed children fill the default slot. `ui:fill` selects a declared named slot. Content runs in the caller's lexical scope; a child's template sees its own props, `slots.<name>` presence flags and `component.id`, not caller data or credentials. Empty supplied slots suppress fallback content. Named fills are not separate components and cannot fetch data.

A component source has one root and uses `ui:outlet`:

```xml
<section xmlns:ui="urn:cococo:ui" xmlns:t="urn:cococo:dataxml">
  <header t:if="slots.header"><ui:outlet name="header"/></header>
  <ui:outlet name="default"><p>No content supplied.</p></ui:outlet>
</section>
```

The corresponding contract is a separate JSON file:

```json
{
  "props": {},
  "slots": { "header": { "required": false }, "default": { "required": false } }
}
```

This illustrates a local custom component, not a replacement for the richer bundled Card. Unknown slots, duplicate named fills and incomplete local file pairs fail validation.

## Native forms

Use a caller-owned form and page-owned action handler. The handler must be declared in the page/site contract; components do not register it implicitly.

```xml
<form xmlns:ui="urn:cococo:ui" xmlns:t="urn:cococo:dataxml" data-portal-action="saveContact">
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

## IDs, keys and overrides

Pass stable, unique IDs for form controls and association references. A component's internal generated identity does not leak into caller slot scope. Prefer page view models containing precomputed IDs when rendering repeated fields; never reuse one literal id in a loop. Component invocation keys identify repeated siblings; they do not authorize access or replace explicit HTML form IDs.

To override Card, copy both `components/card.html` and `components/card.json` to your site's same paths. Local resolution takes precedence. Keep all required slots/props expected by existing callers or change those callers. There is no automatic update merge or CLI installer in v1.

## Frequent errors

| Incorrect | Correct |
| --- | --- |
| `<Button variant="primary">` | `<ui:button variant="primary">…</ui:button>` |
| `:disabled="loading"` | `t:bind-disabled="input.loading"` with a boolean |
| `<template #footer>` | `<ui:fill name="footer">…</ui:fill>` |
| `onclick="save()"` | A page-owned protected native form action |
| A component reads `data.customer` implicitly | Pass a declared prop from the caller |
| Copy only component HTML | Copy the `.html` and `.json` pair |
| A placeholder used instead of a label | A visible label associated with the input id |

Scoped slots, automatic client hydration and component-owned Lua loaders are not v1 features. The source/contract model leaves room for later extensions without inventing them today.

## Repeated fields with descriptions and errors

Give the page loader a view model containing unique association IDs. For example, `data.lines` can contain:

```json
[
  {"key":"line-42","controlId":"quantity-42","descriptionId":"quantity-42-hint","errorId":"quantity-42-error","describedby":"quantity-42-hint quantity-42-error","quantity":"0","error":"Enter at least 1","invalid":true}
]
```

Use a keyed invocation inside the DataXML loop:

```xml
<section xmlns:ui="urn:cococo:ui" xmlns:t="urn:cococo:dataxml">
  <div t:for="data.lines" t:as="line">
    <ui:field t:bind-key="line.key" t:bind-for="line.controlId" label="Quantity" description="Minimum 1 item" t:bind-descriptionId="line.descriptionId" t:bind-error="line.error" t:bind-errorId="line.errorId">
      <ui:input t:bind-id="line.controlId" t:bind-name="line.controlId" type="number" min="1" t:bind-value="line.quantity" t:bind-invalid="line.invalid" t:bind-describedby="line.describedby">
      </ui:input>
    </ui:field>
  </div>
</section>
```

The caller slot can still read `line`; it cannot read Field's private props. Keep the `describedby` list limited to elements actually rendered: omit the error ID when there is no error. The input value remains a string even when its HTML type is number; validate/coerce native form input on the server. This example deliberately uses unique control names because repeated-name collection behavior belongs to the form handler contract, not the component library.

## Migration

The old `portal-component`, `portal-prop`, `portal-fill` and `portal-outlet` syntax is rejected. Rename invocations to `ui:NAME`, move literal props onto attributes, move typed props to `t:bind-PROP`, and rename fills/outlets to `ui:fill`/`ui:outlet`. Use `t:bind-key` for dynamic identity. Republish authored sites after migration; old component-bearing compiled snapshots must be rebuilt. No compatibility alias is provided.
