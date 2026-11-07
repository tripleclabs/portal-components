# Authoring with Portal Components

Read `docs/authoring.md` and `docs/components.md` before generating a page. `catalogue.generated.json` is the machine-readable source of valid props, types, enums, slots and exact working usage. `llms-full.txt` combines the maintained instructions/reference for one-context consumption.

## Hard rules

1. Write XML-shaped HTML with `xmlns:t="urn:cococo:dataxml"`. Close void elements in source: `<input/>`.
2. Invoke `<portal-component name="button">`. Pass literal props with `<portal-prop name="variant" value="secondary"/>`; pass typed data with `<portal-prop name="disabled" t:value="input.disabled"/>`. Do not invent Vue bindings, JS expressions or direct prop attributes.
3. Unnamed children fill the default slot. Named content uses `<portal-fill name="footer">`. Caller slots keep caller scope; component internals only receive `props`, slot-presence flags and `component.id`.
4. Only use props and slots listed in the component contract. Names/enum values are exact. Use `t:value="true"` / `t:value="false"` for boolean constants and `t:value="65"` for numeric constants; `value` always supplies a string. Dynamic values must have the declared type.
5. Components do not fetch or mutate. Keep Lua in page/server handlers and use normal protected page forms. No `<script>`, onclick, client Lua or arbitrary networking.
6. Use real HTML labels, control ids, names and native form semantics. Set button type=submit intentionally. Provide unique ids for repeated controls, and match `for`/`describedby` exactly.
7. Internal URLs use the standard Portal mount-aware helpers/HTML handling. Do not hardcode a staff-preview prefix.
8. Brand with documented `--portal-*` variables. To change markup copy the complete `.html` and `.json` pair locally; do not edit the host bundle.
9. Do not infer upload, sorting, payment, dialog, tabs, client state or combobox functionality from visual markup. Read each component's limits.
10. Compile the result with the real Portal compiler. A plausible-looking snippet is not evidence it compiles.

## Recommended workflow

Choose components from the catalogue, build the semantic native page first, then connect page Lua and progressive regions. Include complete namespaces and contracts in standalone examples. Keep fetched view models serializable and keep repeated presentation components free of loaders. Verify native no-JavaScript behavior, errors, empty results, mobile layout and keyboard use.

If an API is missing from this documentation, say so instead of inventing it. Components are not a general Vue-compatible environment.
