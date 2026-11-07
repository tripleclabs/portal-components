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
