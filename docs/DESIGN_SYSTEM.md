# Alaap Design System

The visual language for Alaap — a knowledge base for golden era Indian film music.

**Aesthetic direction**: Warm scholarly. Deep parchment backgrounds, high-contrast serif headings, maroon accents. Like opening a well-kept personal music journal.

**Inspiration**: "NĀD: Understanding Rāga Music" (Sandeep Bagchee) — warm parchment, deep maroon, decorative restraint. Also: Criterion Collection (scholarly + warm), Smithsonian Folkways (archival + earthy), 1950s–60s record sleeve typography. Not the clinical look of MusicBrainz or existing raga reference sites.

---

## 1. Core Principles

### Warmth over sterility
Deep parchment backgrounds (`#F0E8D8`), warm stone neutrals, serif headings, maroon accents. The subject matter is emotional — the design should reflect that. No cold whites, no clinical grays.

### Color communicates entity type
Amber = raga, blue = artist, green = film, purple = language. These colors are functional, not decorative. They teach the user the data model through repetition.

### Scholarly but accessible
Editorial typography gives weight and personality. Clean body text ensures readability. The feel is a curated music journal — not a database dump.

### Let the data breathe
Consistent spacing, clear metadata hierarchy, whitespace as structural element. Crowded layouts undermine the sense of curation.

---

## 2. Color System

### Surfaces

| Token | Value | Usage |
|-------|-------|-------|
| `bg-cream` | `#F0E8D8` | Page background, header, dropdown backgrounds |
| `bg-stone-50` | Tailwind `stone-50` | Elevated surfaces — property grids, code blocks, lyrics |
| `bg-cream/95` | `#F0E8D8` at 95% | Header with backdrop-blur |

Defined as `--color-cream` in `globals.css` `@theme`, giving us `bg-cream`, `text-cream`, etc.

### Text Hierarchy

| Role | Class | Usage |
|------|-------|-------|
| Primary | `text-stone-900` | Headings, song titles, primary content |
| Secondary | `text-stone-600` | Nav links, secondary metadata |
| Tertiary | `text-stone-500` | Descriptions, body copy |
| Muted | `text-stone-400` | Labels, counts, disabled states, placeholders |

Rule: Use `stone-*` exclusively. No `gray-*` or `neutral-*` in new work.

### Entity Colors

These are established and should not change. Document exact current classes:

| Entity | Background | Text | Hover | Usage |
|--------|-----------|------|-------|-------|
| **Raga** | `bg-amber-50` | `text-amber-800` | `hover:bg-amber-100` | Entity pills, listing card hover, detail page accents |
| **Artist** | `bg-blue-50` | `text-blue-800` | `hover:bg-blue-100` | Entity pills, listing card hover |
| **Film** | `bg-green-50` | `text-green-800` | `hover:bg-green-100` | Entity pills, listing card hover |
| **Language** | `bg-purple-50` | `text-purple-700` | — | Inline badge on non-Hindi songs |
| **YouTube** | — | `text-red-500` | `hover:text-red-600` | Play icon only |

### Accent — Maroon

Primary accent: `maroon` (`#7A2E3C`) — for the site logo, nav hovers, song title hovers, focus rings, section headings on home, card hover tints. Defined as `--color-maroon` in `globals.css` `@theme`, giving us `text-maroon`, `bg-maroon`, `border-maroon`, plus opacity modifiers like `bg-maroon/5`, `border-maroon/30`.

Maroon is distinct from all entity colors and connects to the scholarly book aesthetic (NĀD cover). It's the "Alaap brand color" — not tied to any data entity.

### Borders

| Current | Proposed |
|---------|----------|
| `border-neutral-200` | `border-stone-200` |
| `border-neutral-100` | `border-stone-100` |

### Rules

- No cold grays (`gray-*`, `neutral-*`) in new UI work.
- No decorative color — every color usage must map to a semantic role.
- No gradients.

---

## 3. Typography

### Font Pairing

| Role | Font | Source | Rationale |
|------|------|--------|-----------|
| **Headings** | Playfair Display | Google Fonts (serif) | High stroke contrast (thick/thin), Didone character. Closest match to the NĀD book cover typography. |
| **Body** | Inter | Google Fonts (sans-serif) | Clean, highly readable. |
| **Notation** | System monospace | `font-mono` | Sargam sequences need fixed-width alignment. |

Playfair Display loaded via `next/font/google` in `layout.tsx` as `--font-playfair`. The `font-heading` utility is defined in `globals.css` via `@utility` (not `@theme` — `var()` references don't work inside `@theme` in Tailwind v4).

### Scale

| Token | Font | Size | Weight | Color | Usage |
|-------|------|------|--------|-------|-------|
| `heading-page` | Playfair Display | `text-3xl` | `font-bold` | `text-stone-900` | Page titles — "Raga Bhairavi", "Artists" |
| `heading-section` | Playfair Display | `text-xl` | `font-semibold` | `text-maroon` (home) / `text-stone-900` | Section headers — "Songs in Bhairavi" |
| `heading-card` | Inter | `text-base` | `font-semibold` | `text-stone-900` | Card titles, list item titles |
| `body` | Inter | `text-sm` | `font-normal` | `text-stone-700` | Primary body content |
| `body-secondary` | Inter | `text-sm` | `font-normal` | `text-stone-500` | Descriptions, metadata values |
| `label` | Inter | `text-xs` | `font-medium` | `text-stone-400` | Uppercase metadata labels — "AROHA", "THAAT", "COMPOSER" |
| `notation` | Mono | `text-sm` | `font-normal` | `text-stone-800` | Sargam — "S r G m P D n S'" |

### Rules

- Max 3 font sizes per visual section.
- Labels always lighter weight/color than their values.
- Serif (Playfair Display) for headings only — never for body text or UI elements.
- Uppercase treatment (`uppercase tracking-wide`) reserved for metadata labels.

---

## 4. Musical Notation Display

Sargam (note sequences) have a specific visual convention in Hindustani music:

### Notation Conventions

- **Shuddha (natural)**: Uppercase — S R G M P D N
- **Komal (flat)**: Lowercase — r g d n
- **Tivra (sharp)**: Uppercase M only (tivra Ma)
- **Octave markers**: S' (upper), S. (lower) — when present in source data

### Display Treatment

```
class="font-mono text-sm tracking-widest text-stone-800"
```

Monospace with wide tracking ensures each note is visually distinct. This treatment applies to:
- Aroha / Avaroha sequences
- Pakad (characteristic phrases)
- Any inline sargam reference

### Future Enhancement (not required now)

Color-coding shuddha vs komal vs tivra notes would add an extra layer of readability. If implemented, use subtle background highlights rather than text color changes to avoid clashing with the entity color system.

---

## 5. Spacing

### Tokens

| Token | Tailwind | Pixels | Usage |
|-------|----------|--------|-------|
| `space-xs` | `1` | 4px | Inline gaps, icon spacing |
| `space-sm` | `2` | 8px | Badge padding, tight element groups |
| `space-md` | `4` | 16px | Standard component padding, form gaps |
| `space-lg` | `6` | 24px | Section separation within a component |
| `space-xl` | `8` | 32px | Major section breaks |
| `space-2xl` | `12` | 48px | Page-level vertical separation |

### Patterns

| Context | Value |
|---------|-------|
| Card internal padding | `p-4` |
| Grid gaps (tight) | `gap-2` |
| Grid gaps (standard) | `gap-4` |
| Vertical section rhythm | `mt-8` to `mt-12` |
| Page container | `mx-auto max-w-4xl px-4 py-8` (detail pages) |
| Page container | `mx-auto max-w-6xl px-4 py-8` (listings, search) |

---

## 6. Entity System

Each entity type has a complete visual language — pill badge, listing card, and detail page treatment.

### Raga (amber)

- **Pill badge**: `inline-block rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors`
- **Listing card hover**: `hover:border-amber-200 hover:bg-amber-50/50`
- **Detail page**: Property grid with `bg-stone-50 border-stone-100` container; amber accent on key elements

### Artist (blue)

- **Pill badge**: Same structure, `bg-blue-50 text-blue-800 hover:bg-blue-100`
- **Listing card hover**: `hover:border-blue-200 hover:bg-blue-50/50`
- **Role differentiation**: Singer, Composer, Lyricist tabs/badges should be visually distinct. Use subtle secondary indicators (e.g., a small icon or role label in `text-xs text-stone-400`) alongside the blue pill.

### Film (green)

- **Pill badge**: Same structure, `bg-green-50 text-green-800 hover:bg-green-100`
- **Listing card hover**: `hover:border-green-200 hover:bg-green-50/50`

### Language (purple)

- **Inline badge**: `rounded bg-purple-50 px-1.5 py-0.5 text-xs font-medium text-purple-700`
- Smaller than entity pills. Only shown for non-Hindi songs.

### YouTube (red)

- **Icon only**: `text-red-500 hover:text-red-600` on a play triangle SVG
- No pill badge. No background. Red is reserved exclusively for the YouTube play indicator.

### Entity Legend

Add a subtle inline legend on the search results page and home page. Not a modal or tooltip — baked into the layout near entity badges:

```
Ragas · Artists · Films
```

Each word preceded by a small colored dot matching the entity color. Implemented as small `inline-block rounded-full w-2 h-2` spans. Light treatment — `text-xs text-stone-400` for the text.

---

## 7. Component Patterns

Exact Tailwind classes for each shared component. These document the target state (post-refresh). Current code uses `neutral-*`; migrate to `stone-*` as each component is touched.

### EntityLink

*Source: `app/components/entity-link.tsx`*

```
inline-block rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
```

Plus entity-specific color classes from Section 6. No changes to structure needed — just swap `neutral` references elsewhere to `stone`.

### SongCard

*Source: `app/components/song-card.tsx`*

```
Container: border-b border-stone-100 py-3 last:border-b-0
Title:     font-medium text-stone-900 hover:text-maroon
Metadata:  mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500
Film link: hover:text-stone-700
```

Changes from original: `neutral` → `stone`, title hover from `blue-700` → `maroon` (aligns with accent color).

### Property Grid

*Source: `app/ragas/[slug]/page.tsx`*

```
Container: grid grid-cols-2 gap-3 rounded-lg border border-stone-100 bg-stone-50 p-4 sm:grid-cols-3
Label:     text-xs font-medium uppercase tracking-wide text-stone-400
Value:     mt-0.5 text-sm text-stone-700
```

Use for raga properties (aroha, avaroha, thaat, etc.), song metadata grids, and any key-value display.

### Listing Cards

Browse pages for ragas, artists, films:

```
Container: rounded-lg border border-stone-200 p-4 transition-colors [entity-hover]
Title:     font-semibold text-stone-900
Subtitle:  text-sm text-stone-500
Count:     text-sm text-stone-400
```

Where `[entity-hover]` is the entity-specific hover from Section 6.

### Tabs (Artist Roles)

```
Container: flex gap-1 border-b border-stone-200
Tab:       px-4 py-2 text-sm font-medium text-stone-500 hover:text-stone-700
Active:    border-b-2 border-stone-900 text-stone-900
```

Future: add role-specific visual cues (icon or subtle background tint) to differentiate Singer / Composer / Lyricist at a glance.

### Header

*Source: `app/components/header.tsx`*

```
Container: sticky top-0 z-50 border-t-2 border-t-maroon border-b border-b-stone-200 bg-cream/95 backdrop-blur
Logo:      font-heading text-xl font-bold tracking-tight text-maroon
Nav link:  text-sm font-medium text-stone-600 hover:text-maroon
```

The thin maroon top border evokes the NĀD book spine. Logo in maroon + Playfair Display establishes brand identity.

### Search Input

*Source: `app/search/search-input.tsx`*

```
Input:      w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm
            placeholder:text-stone-400 focus:border-maroon focus:outline-none
Dropdown:   absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg
            border border-stone-200 bg-cream py-1 shadow-lg
Active row: bg-stone-100 text-stone-900
Hover row:  text-stone-700 hover:bg-stone-50
```

Focus border uses maroon accent color.

### Pagination

*Source: `app/components/pagination.tsx`*

```
Container:   flex items-center justify-center gap-4 py-6 text-sm
Link:        rounded px-3 py-1.5 text-stone-600 hover:bg-stone-100
Disabled:    rounded px-3 py-1.5 text-stone-300
Page count:  text-stone-500
```

### Empty State

*Source: `app/components/empty-state.tsx`*

```
Container: py-12 text-center
Message:   text-lg text-stone-400
```

---

## 8. Page-Specific Notes

### Home

- Hero: "Alaap" in `text-5xl text-maroon font-heading`, ornamental divider (`✻` flanked by maroon lines)
- Stats row with maroon-tinted dividers
- Entity color legend (amber/blue/green dots) below stats
- Browse category cards with `hover:border-maroon/30 hover:bg-maroon/5`
- Featured ragas grid with same maroon hover treatment
- Well-documented songs list

### Raga Detail

- Property grid is the hero element — prominent placement, generous padding
- Sargam notation (aroha, avaroha, pakad) uses monospace + tracking treatment
- Song list below: **omit the raga pill badge** on each song card — it's redundant when every song on the page shares the same raga
- Thaat link as a secondary breadcrumb: "Thaat: Bilawal" linking to a filtered view

### Song Detail

- Metadata grid: film, year, composer, lyricist, singers, raga(s), taal(s), language
- YouTube embed with warm border treatment
- Lyrics section: clean, generous line-height, serif optional for poetic feel

### Artist Profile

- Role tabs (Singer / Composer / Lyricist) with visual differentiation
- Song list per role, paginated
- Future: "Signature ragas" section — ragas this artist returns to most often

### Film Detail

- Composer and lyricist prominently displayed
- Song list with raga badges
- Year and language as secondary metadata

### Search

- Search input with autocomplete dropdown
- Filter bar: entity type, language, year range
- Results: song cards with entity badges
- Entity legend near results — reinforces color coding
- Sort controls: relevance, year (asc/desc), title

### Browse Listings (Ragas, Artists, Films)

- Consistent card pattern per entity type
- Entity-appropriate hover color
- Count metadata (song count for ragas, film count for artists)
- Alphabetical or count-based sort

---

## 9. Anti-Patterns

**Don't** use cold grays (`gray-*`, `neutral-*`) — use `stone-*` exclusively for warm neutrals.

**Don't** apply decorative color to non-entity elements. Color = meaning.

**Don't** use sans-serif for page-level headings. Serif (Playfair Display) is the heading font.

**Don't** show redundant entity badges. Example: every song on the "Raga Bhairavi" page already shares that raga — remove the amber "Bhairavi" pill from each song card on that page.

**Don't** overload song cards. Metadata stays on one line: film, year, singer, composer. If it wraps, it's too much.

**Don't** add icons without clear purpose. Icons compete with entity color badges for attention.

**Don't** use gradients, shadows heavier than `shadow-sm`, or border-radius larger than `rounded-lg`.

---

## 10. Checklist Before Shipping UI

Use this for every page or component touched during the design refresh:

- [x] Background uses warm parchment (`bg-cream` / `#F0E8D8`), not white
- [x] Page headings use serif font (Playfair Display via `font-heading`)
- [x] All text colors use `stone-*`, not `gray-*` or `neutral-*`
- [x] Entity links use correct color for their entity type
- [x] Borders use `stone-200` / `stone-100`
- [ ] Spacing follows the token scale (Section 5)
- [x] Interactive elements have hover/focus states
- [x] Focus states use maroon accent (`focus:border-maroon`)
- [x] Musical notation uses `font-mono tracking-widest`
- [ ] Max 3 text sizes per visual section
- [ ] No redundant entity badges on single-entity pages
- [ ] Mobile responsive (test at 375px width)
