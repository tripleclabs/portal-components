# Theme tokens

Add `portal-theme` to the site content root. The supplied stylesheet has no global reset, no remote fonts and no mandatory CSS framework. Tokens inherit through components.

## Presets and modes

Three presets share one set of markup; only tokens change.

| Preset | Select with | Character |
| --- | --- | --- |
| Neutral (default) | no attribute | Zinc greys, Inter, small radii, hairline borders, near-invisible shadow. Your brand colour is the only colour. |
| Editorial | `data-preset="editorial"` | Warm paper tones, Fraunces display headings, crisp corners, no shadows. |
| Studio | `data-preset="studio"` | Lavender canvas, vivid brand, Plus Jakarta Sans, pill buttons, soft lift. |

`data-theme="dark"` selects dark mode and combines with any preset. `data-density="compact"` or `"roomy"` scales spacing and control heights together.

```html
<main class="portal-theme" data-preset="studio" data-theme="dark">…</main>
```

## Knobs

Most sites only need the five knobs. Place overrides after the bundled styles.

```css
.portal-theme.my-brand {
  --portal-brand: #145744;
  --portal-radius: .375rem;
  --portal-font: "Source Sans 3", system-ui, sans-serif;
  --portal-font-heading: Georgia, serif;
  --portal-density: 1;
}
```

`--portal-brand`, `--portal-radius` and `--portal-density` work on any element, including a nested wrapper. `--portal-font` and `--portal-font-heading` take effect on the theme root only: the root sets `font-family` from them and everything inherits that computed font, so set them on the `portal-theme` element (or in a rule that matches it), not on a wrapper inside it.

Every bundled preset and mode selector is written `.portal-theme:where(…)`, so each is exactly as specific as `.portal-theme` alone. `.portal-theme.my-brand` is more specific, so it wins in every preset and in light and dark mode, whichever stylesheet loads first. The theme builder's `.portal-theme.my-theme` export works the same way. Inline custom properties also work. A brand set this way applies in light and dark mode; scope it with `[data-theme="dark"]` to choose a separate dark brand.

The brand is the only input for interactive colour. Hover and pressed shift the brand's OKLCH lightness toward mid-lightness (so near-black and near-white brands still respond); subtle tints, the focus ring and the text on primary buttons are derived too. All of it happens inside each component rule (CSS relative colour and `color-mix()`), so a brand change never produces mismatched states. Button text is black or white, whichever suits the lightness of the current state's background.

Supported browsers: the derived colours need CSS relative colour syntax, `color-mix()`, `pow()`, `:has()` and container queries, which means Chrome and Edge 120+, Firefox 128+ and Safari 18+. In an older browser that has `color-mix()` but no relative colour, button text falls back to `--portal-primary-content`, or white when that is unset, and hover and pressed mix the background toward the canvas. Set `--portal-primary-content` if your brand is light and you need those browsers. Because the derivation happens where the colour is used, a brand override on a nested wrapper re-derives everything inside it:

```html
<div style="--portal-brand:#e11d48">…buttons here hover and focus in rose…</div>
```

## Semantic tokens

Presets set the semantic tokens: canvas, surface, surface-muted, text, text-muted and border; secondary, accent, success, warning, danger and info, each with a `-content` partner; three shadows; the mono font; content and reading widths; the type-scale ratio; and the motion duration. Override any of them the same way as a knob.

`--portal-border` is the boundary of form controls and meets 3:1 against the surface. Cards, separators and table rules use a lighter hairline derived from it.

Headings h1–h4 follow `--portal-type-ratio` (h1 is the ratio to the fourth power, in rem); h5 and h6 are `1rem`. Spacing is a quarter-rem step multiplied by `--portal-density`, recomputed on every library element so a wrapper can change density for its contents. Radii derive from `--portal-radius`: small is 0.6×, medium 1×, large 1.5×, and pills are fully rounded.

`--portal-primary`, `--portal-primary-content` and `--portal-focus` default to the brand (and to a derived black or white) and are resolved where used. Set them only to decouple a role from the brand. The optional component overrides `--portal-button-background`, `--portal-button-color`, `--portal-input-background`, `--portal-input-color` and `--portal-card-shadow` also fall back to the semantic tokens and work on a wrapper.

See [the generated token reference](tokens.md) for every name and default.

## Fonts

Neutral uses Inter, Editorial adds Fraunces for headings and Studio uses Plus Jakarta Sans. Their Latin and Latin Extended subsets ship in `fonts/` under the SIL Open Font License (see `fonts/NOTICE.md`). The stylesheet points at the Portal host's versioned `/_portal/fonts/<library-version>/` route (for this release `/_portal/fonts/0.4.0/`), which serves them. The version in the URL changes with every library release, so the host can let browsers cache fonts indefinitely. They are deliberately not part of a site's file map, which is text-only. The static showcase serves the same files from its own `fonts/` folder. Management previews in the platform console are isolated from every host route, so they always render with the system fallbacks; the published site uses the bundled fonts. Each stack ends in a system fallback and uses `font-display: swap`. A face downloads only when text uses it, so setting `--portal-font` and `--portal-font-heading` to a system stack opts out entirely. No font is fetched from a third party.

## Accessibility

The supplied presets keep body and muted text at 4.5:1 or better on every surface, each `-content` colour at 4.5:1 on its partner, and control borders at 3:1. A custom brand keeps legible button text automatically, but other custom colours can reduce contrast: check text/background pairs together. Focus outlines are drawn in the focus colour pulled toward the text colour, so they stay visible with very pale or very dark brands.

Transitions use `--portal-motion`. Under `prefers-reduced-motion` component transitions and animations stop regardless of that token, so a theme that sets it cannot re-enable motion. Forced-colours mode keeps system-colour borders rather than letting brand borders remove essential affordances. Component CSS uses logical properties only, so pages with `dir="rtl"` mirror correctly. Headings and paragraphs inside the theme use `overflow-wrap: anywhere`, so a long unbroken word, URL or number wraps instead of widening the page.

Do not add a second `portal-theme` class to nested elements: that resets the defaults at each new theme root. Copy a component when you need different structure or selectors.

## Headings

`hero` and `page-header` each render the page's h1. Use one of them, once per page. `section` titles, `order-summary` and `estimate-panel` render h2; `product-card`, `basket-line`, `endpoint` and `tab-panel` render h3. `card` does not force a heading: choose the level you put in its header fill.
