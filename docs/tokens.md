# Token reference

Generated from styles/tokens.css. Set tokens on the theme root or on a wrapper around components. Presets (`data-preset="editorial"` or `"studio"`, absent for Neutral) and dark mode (`data-theme="dark"`) change the semantic values; the names stay the same.

## Knobs

The five everyday controls. Changing the brand re-derives hover and pressed (an OKLCH lightness shift toward mid-lightness), tint, focus ring and button text inside each component, so it also works on a nested wrapper. `--portal-density` is a unitless multiplier for spacing and control heights (`data-density="compact"` is .875, `"roomy"` is 1.125).

| Token | Neutral light default |
| --- | --- |
| `--portal-brand` | `#18181b` |
| `--portal-radius` | `.5rem` |
| `--portal-font` | `Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| `--portal-font-heading` | `var(--portal-font)` |
| `--portal-density` | `1` |

## Semantic tokens

Set by presets. Each `-content` colour is the text colour used on its partner.

| Token | Neutral light default |
| --- | --- |
| `--portal-canvas` | `#fafafa` |
| `--portal-surface` | `#ffffff` |
| `--portal-surface-muted` | `#f4f4f5` |
| `--portal-text` | `#09090b` |
| `--portal-text-muted` | `#66666e` |
| `--portal-border` | `#8a8a93` |
| `--portal-secondary` | `#f4f4f5` |
| `--portal-secondary-content` | `#18181b` |
| `--portal-accent` | `#e4e4e7` |
| `--portal-accent-content` | `#18181b` |
| `--portal-success` | `#15803d` |
| `--portal-success-content` | `#ffffff` |
| `--portal-warning` | `#b45309` |
| `--portal-warning-content` | `#ffffff` |
| `--portal-danger` | `#dc2626` |
| `--portal-danger-content` | `#ffffff` |
| `--portal-info` | `#2563eb` |
| `--portal-info-content` | `#ffffff` |
| `--portal-shadow-sm` | `0 1px 2px rgb(9 9 11 / .05)` |
| `--portal-shadow-md` | `0 1px 3px rgb(9 9 11 / .08), 0 1px 2px -1px rgb(9 9 11 / .06)` |
| `--portal-shadow-lg` | `0 16px 40px -16px rgb(9 9 11 / .24), 0 4px 10px -4px rgb(9 9 11 / .08)` |
| `--portal-font-mono` | `ui-monospace, "SF Mono", "Cascadia Code", Menlo, Consolas, monospace` |
| `--portal-content-width` | `72rem` |
| `--portal-reading-width` | `42rem` |
| `--portal-type-ratio` | `1.2` |
| `--portal-motion` | `140ms` |

## Resolved where used

These roles are never declared on the theme root, so a nested `--portal-brand` override reaches them. Set them explicitly to decouple from the brand.

| Token | When unset |
| --- | --- |
| `--portal-primary` | `var(--portal-brand)` |
| `--portal-primary-content` | Black or white, whichever suits the primary's OKLCH lightness (threshold 0.62) |
| `--portal-focus` | `var(--portal-brand)` |

## Component overrides

Optional and undeclared; each falls back to the semantic tokens.

| Token | Falls back to |
| --- | --- |
| `--portal-button-background` | primary |
| `--portal-button-color` | primary content (derived from the button background when unset) |
| `--portal-input-background` | `--portal-surface` |
| `--portal-input-color` | `--portal-text` |
| `--portal-card-shadow` | `--portal-shadow-sm` |
