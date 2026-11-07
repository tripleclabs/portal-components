# Theme tokens

Add `portal-theme` to the site content root. The supplied stylesheet has no global reset, remote fonts or mandatory CSS framework. Tokens inherit through components. The default theme is light; `data-theme="dark"` and `data-theme="atelier"` select bundled examples.

```css
/* Place after the bundled styles. */
.portal-theme.my-brand {
  --portal-primary: #145744;
  --portal-primary-content: #ffffff;
  --portal-focus: #145744;
  --portal-radius-md: .25rem;
  --portal-font-family: Georgia, serif;
}
```

For a local override, set a token on a wrapper around a component. Do not add a second `portal-theme` class on every nested element: that resets the defaults at each new theme root. Copy a component when you need different structure or selectors.

Colour pairs must be checked together. The default themes supply text/background pairs; a custom token can break contrast or focus visibility. Preserve native semantics and test high contrast/forced-colour mode. `prefers-reduced-motion` sets the motion-duration token to zero. V1 components do not rely on animation.

See [the generated token reference](tokens.md) for all exact names/defaults. Typography, spacing, border, radius and content-width tokens are site-wide defaults; the library deliberately avoids an undocumented variable for every declaration.

## Branding contract

Set tokens on the theme root after the bundled stylesheet. The same rules work
with a named theme: `.portal-theme.my-brand` has the same specificity as a bundled
`data-theme` selector, so the later author stylesheet wins. Inline custom
properties also work. Existing published sites retain their captured library CSS.

| Area | Main controls |
| --- | --- |
| Surfaces and text | `--portal-canvas`, `--portal-surface`, `--portal-surface-muted`, `--portal-text`, `--portal-text-muted` |
| Semantic colours | `primary`, `secondary`, `accent`, `info`, `success`, `warning`, `danger`, with matching `-content` foreground tokens (all prefixed `--portal-`) |
| Body typography | `--portal-font-family`, `--portal-font-mono`, `--portal-font-size`, `--portal-font-size-xs/sm/lg/xl`, `--portal-line-height`, `--portal-letter-spacing`, `--portal-font-weight-normal/medium/bold` |
| Headings | `--portal-heading-font-family`, `--portal-heading-font-weight`, `--portal-heading-line-height`, `--portal-heading-letter-spacing`, `--portal-heading-size-1` through `-6` |
| Form controls | `--portal-control-font-family`, `--portal-control-font-size`, `--portal-control-font-weight`, `--portal-control-line-height`, `--portal-control-height` and `-sm/-lg`, `--portal-choice-size` |
| Borders and shape | `--portal-border`, `--portal-border-width`, `--portal-border-style`, `--portal-border-width-strong/accent`, `--portal-radius-sm/md/lg/pill` |
| Elevation | `--portal-shadow` (cards), `--portal-shadow-control`, `--portal-shadow-button`, `--portal-shadow-overlay` (available for authored compositions) |
| Focus and disabled state | `--portal-focus`, `--portal-focus-width`, `--portal-focus-offset`, `--portal-disabled-opacity` |
| Layout | `--portal-space-*`, `--portal-content-width`, `--portal-reading-width` |

Semantic tokens are available for authored content as well as library components;
not every colour role has a built-in component variant. For example, `accent` and
its content pair can style a branded callout without introducing new markup APIs.
Heading font defaults to inheritance; heading size tokens apply to ordinary h1–h6
inside the theme. Component-specific small headings use the size scale (`lg`/`xl`).
Controls inherit body typography unless their control tokens are changed.

```css
.portal-theme.my-brand {
  --portal-primary: #145744;
  --portal-primary-content: #ffffff;
  --portal-font-family: Georgia, serif;
  --portal-font-size: 1.125rem;
  --portal-line-height: 1.6;
  --portal-heading-font-family: system-ui, sans-serif;
  --portal-heading-font-weight: 700;
  --portal-heading-letter-spacing: -.02em;
  --portal-heading-size-1: 2.5rem;
  --portal-control-font-family: system-ui, sans-serif;
  --portal-border-width: 2px;
  --portal-border-style: solid;
  --portal-radius-md: .25rem;
  --portal-radius-lg: .5rem;
  --portal-shadow: 0 6px 20px rgb(20 87 68 / 12%);
  --portal-shadow-control: inset 0 1px 2px rgb(0 0 0 / 8%);
  --portal-focus-width: 3px;
  --portal-focus-offset: 4px;
}
```

Optional per-component overrides are resolved where used, so they also work on a
wrapper inside an existing theme: `--portal-button-background`/`--portal-button-color`
(primary buttons), `--portal-input-background`/`--portal-input-color`, and
`--portal-card-shadow`. They fall back to the semantic tokens; they are not required
root declarations. A wrapper can also override the shared tokens directly.
Forced-colour mode deliberately retains system-colour borders rather than allowing
brand borders to remove essential affordances. Custom themes remain responsible for
contrast; full shadow strings can be set to `none` for a flat design. No font is
fetched automatically: use available system fonts or provide an allowed font asset.
