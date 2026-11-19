# packages/ui

The design system: tokens from the prototype, light and dark, and accessible components on Radix and Tailwind 4. Every component has Storybook stories covering its states. Each story runs in real Chromium and fails on any axe violation.

```tsx
import { Button, Money, StatusPill } from '@pitchforge/ui';
import '@pitchforge/ui/styles.css'; // once, in the app

<Money value={{ amount: '125000.00', currency: 'BDT' }} />; // ৳1,25,000
```

| File                        | Components                                                       |
| --------------------------- | ---------------------------------------------------------------- |
| `components/button.tsx`     | `Button`, `IconButton`                                           |
| `components/form.tsx`       | `Field`, `Input`, `Textarea`, `Select`, `Checkbox`               |
| `components/date.tsx`       | `DateInput`, `DateText` (`04 Nov 2026`)                          |
| `components/money.tsx`      | `Money`                                                          |
| `components/display.tsx`    | `StatusPill`, `Tag`, `KpiTile`, `Steps`, `Callout`, `EmptyState` |
| `components/overlay.tsx`    | `Dialog`, `Tabs`, `ToasterProvider` + `useToast`                 |
| `components/data-table.tsx` | `DataTable` (server-side sort; loading, error and empty states)  |

## Rules

- **Colours come from tokens** (`src/styles/tokens.css`): `bg-surface`, `text-muted`, `border-line`. No one-off colours.
- **No strings in components.** Labels arrive as props, so the app passes them through i18n. Names that only screen readers use are props too (`closeLabel`, `stateLabels`).
- **No business logic.** `Money` formats; it never adds. `DataTable` asks the server to sort; it never sorts rows.
- **No injected `<style>` elements**, because the strict Content-Security-Policy blocks them. That is why `Toast` uses Radix instead of sonner, and `Select` is a styled native select.

Components follow the shadcn/ui pattern but are written here, not copied with its CLI, so every line is reviewed.

## Commands

```bash
pnpm --filter @pitchforge/ui storybook        # http://localhost:6006
pnpm --filter @pitchforge/ui build-storybook
pnpm --filter @pitchforge/ui exec playwright install chromium   # once
pnpm test:storybook                           # all stories in Chromium with axe
pnpm exec vitest run --project ui             # unit tests: tokens, contrast, Money, DateText
```

Storybook shows system fonts. The app loads IBM Plex and Archivo with `next/font`, self-hosted.

Stories set `parameters: { themes: 'both' }` to render light and dark side by side, so axe checks both in one run. Anything that opens in a portal uses one theme per story, because a portal renders on `<body>`.
