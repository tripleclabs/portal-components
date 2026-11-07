# Authoring contract

## Props

Literal values are supplied through `portal-prop` children:

```xml
<portal-component name="button">
  <portal-prop name="variant" value="secondary"/>
  <portal-prop name="disabled" t:value="true"/>
  Save draft
</portal-component>
```

Dynamic values use the existing DataXML expression evaluator:

```xml
<portal-component name="badge">
  <portal-prop name="variant" t:value="data.statusVariant"/>
  <span t:text="data.statusLabel"/>
</portal-component>
```

A string, number or boolean stays that type; values are validated before rendering. Defaults apply when a prop is absent. Explicit null is accepted only when declared nullable. Unknown props, invalid types/enums and missing required values are errors. Do not use direct attributes such as `<portal-component variant="secondary">`.

## Slots and isolation

Unnamed children fill the default slot. `portal-fill` selects a declared named slot. Content runs in the caller's lexical scope; a child's template sees its own props, `slots.<name>` presence flags and `component.id`, not caller data or credentials. Empty supplied slots suppress fallback content. Named fills are not separate components and cannot fetch data.

A component source has one root and uses `portal-outlet`:

```xml
<section xmlns:t="urn:cococo:dataxml">
  <header t:if="slots.header"><portal-outlet name="header"/></header>
  <portal-outlet name="default"><p>No content supplied.</p></portal-outlet>
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
<form xmlns:t="urn:cococo:dataxml" data-portal-action="saveContact">
  <portal-component name="field">
    <portal-prop name="for" value="customer-email"/>
    <portal-prop name="label" value="Email address"/>
    <portal-component name="input">
      <portal-prop name="id" value="customer-email"/>
      <portal-prop name="name" value="email"/>
      <portal-prop name="type" value="email"/>
      <portal-prop name="autocomplete" value="email"/>
      <portal-prop name="required" t:value="true"/>
    </portal-component>
  </portal-component>
  <portal-component name="button">
    <portal-prop name="type" value="submit"/>
    Save contact
  </portal-component>
</form>
```

The Portal host adds protected action routing and form fences. Server-side authorization and validation remain required. Use a native GET form with an ordinary action for filtering. The showcase can demonstrate native controls but cannot execute an instance's business APIs.

## IDs, keys and overrides

Pass stable, unique IDs for form controls and association references. A component's internal generated identity does not leak into caller slot scope. Prefer page view models containing precomputed IDs when rendering repeated fields; never reuse one literal id in a loop. Component invocation keys identify repeated siblings; they do not authorize access or replace explicit HTML form IDs.

To override Card, copy both `components/card.html` and `components/card.json` to your site's same paths. Local resolution takes precedence. Keep all required slots/props expected by existing callers or change those callers. There is no automatic update merge or CLI installer in v1.

## Frequent errors

| Incorrect | Correct |
| --- | --- |
| `<Button variant="primary">` | `<portal-component name="button"><portal-prop name="variant" value="primary"/>…</portal-component>` |
| `:disabled="loading"` | `<portal-prop name="disabled" t:value="input.loading"/>` with a boolean |
| `<template #footer>` | `<portal-fill name="footer">…</portal-fill>` |
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
<section xmlns:t="urn:cococo:dataxml">
  <div t:for="data.lines" t:as="line">
    <portal-component name="field" t:attr-key="line.key">
      <portal-prop name="for" t:value="line.controlId"/>
      <portal-prop name="label" value="Quantity"/>
      <portal-prop name="description" value="Minimum 1 item"/>
      <portal-prop name="descriptionId" t:value="line.descriptionId"/>
      <portal-prop name="error" t:value="line.error"/>
      <portal-prop name="errorId" t:value="line.errorId"/>
      <portal-component name="input">
        <portal-prop name="id" t:value="line.controlId"/>
        <portal-prop name="name" t:value="line.controlId"/>
        <portal-prop name="type" value="number"/>
        <portal-prop name="min" value="1"/>
        <portal-prop name="value" t:value="line.quantity"/>
        <portal-prop name="invalid" t:value="line.invalid"/>
        <portal-prop name="describedby" t:value="line.describedby"/>
      </portal-component>
    </portal-component>
  </div>
</section>
```

The caller slot can still read `line`; it cannot read Field's private props. Keep the `describedby` list limited to elements actually rendered: omit the error ID when there is no error. The input value remains a string even when its HTML type is number; validate/coerce native form input on the server. This example deliberately uses unique control names because repeated-name collection behavior belongs to the form handler contract, not the component library.
