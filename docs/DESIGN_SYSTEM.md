# Alaap Design System

The visual language for Alaap — a knowledge base for golden era Indian film music.

**Aesthetic direction**: Warm scholarly. Cream backgrounds, serif headings, amber/gold accents. Like opening a well-kept personal music journal.

**Inspiration**: Criterion Collection (scholarly + warm), Smithsonian Folkways (archival + earthy), 1950s–60s record sleeve typography. Not the clinical look of MusicBrainz or existing raga reference sites.

---

## 1. Core Principles

### Warmth over sterility
Cream backgrounds, warm neutrals, serif headings. The subject matter is emotional — the design should reflect that. No cold whites, no clinical grays.

### Color communicates entity type
Amber = raga, blue = artist, green = film, purple = language. These colors are functional, not decorative. They teach the user the data model through repetition.

### Scholarly but accessible
Editorial typography gives weight and personality. Clean body text ensures readability. The feel is a curated music journal — not a database dump.

### Let the data breathe
Consistent spacing, clear metadata hierarchy, whitespace as structural element. Crowded layouts undermine the sense of curation.

---

## 2. Color System

### Surfaces

| Token | Current | Proposed | Value |
|-------|---------|----------|-------|
| `bg-page` | `white` | warm cream | `#FAF8F3` |
| `bg-surface` | `neutral-50` | `stone-50` | Tailwind `stone-50` |
| `bg-header` | `white/95` | warm cream/95 | `#FAF8F3` at 95% opacity |

The background shift from white to cream is the single highest-impact change in the refresh. Apply it to `<body>` or the root layout wrapper.

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

### Accent

Primary accent: `amber-700` — for links, active states, and interactive highlights. Amber connects to the raga entity (the most central concept in Alaap) and carries warmth.

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
| **Headings** | EB Garamond | Google Fonts (serif) | Editorial weight, good Latin readability, warm character. Evokes scholarly music writing. |
| **Body** | Inter | System / Google Fonts (sans-serif) | Clean, highly readable. Effectively already in use via Tailwind defaults. |
| **Notation** | System monospace | `font-mono` | Sargam sequences need fixed-width alignment. |

Load EB Garamond via `next/font/google` in the root layout. Apply to a CSS variable (e.g., `--font-heading`) and reference via a Tailwind `font-heading` utility.

### Scale

| Token | Font | Size | Weight | Color | Usage |
|-------|------|------|--------|-------|-------|
| `heading-page` | EB Garamond | `text-3xl` | `font-bold` | `text-stone-900` | Page titles — "Raga Bhairavi", "Artists" |
| `heading-section` | EB Garamond | `text-xl` | `font-semibold` | `text-stone-900` | Section headers — "Songs in Bhairavi" |
| `heading-card` | Inter | `text-base` | `font-semibold` | `text-stone-900` | Card titles, list item titles |
| `body` | Inter | `text-sm` | `font-normal` | `text-stone-700` | Primary body content |
| `body-secondary` | Inter | `text-sm` | `font-normal` | `text-stone-500` | Descriptions, metadata values |
| `label` | Inter | `text-xs` | `font-medium` | `text-stone-400` | Uppercase metadata labels — "AROHA", "THAAT", "COMPOSER" |
| `notation` | Mono | `text-sm` | `font-normal` | `text-stone-800` | Sargam — "S r G m P D n S'" |

### Rules

- Max 3 font sizes per visual section.
- Labels always lighter weight/color than their values.
- Serif for headings only — never for body text or UI elements.
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
Title:     font-medium text-stone-900 hover:text-amber-700
Metadata:  mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-stone-500
Film link: hover:text-stone-700
```

Changes from current: `neutral` → `stone`, title hover from `blue-700` → `amber-700` (aligns with accent color).

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
Active:    border-b-2 border-blue-600 text-blue-700
```

Future: add role-specific visual cues (icon or subtle background tint) to differentiate Singer / Composer / Lyricist at a glance.

### Header

*Source: `app/components/header.tsx`*

```
Container: sticky top-0 z-50 border-b border-stone-200 bg-[#FAF8F3]/95 backdrop-blur
Logo:      font-heading text-xl font-bold tracking-tight text-stone-900
Nav link:  text-sm font-medium text-stone-600 hover:text-stone-900
```

The logo ("Alaap") should use the serif heading font (EB Garamond) for brand identity.

### Search Input

*Source: `app/search/search-input.tsx`*

```
Input:      w-full rounded-lg border border-stone-200 px-4 py-2.5 text-sm
            placeholder:text-stone-400 focus:border-amber-400 focus:outline-none
Dropdown:   absolute z-50 mt-1 max-h-80 w-full overflow-auto rounded-lg
            border border-stone-200 bg-white py-1 shadow-lg
Active row: bg-stone-100 text-stone-900
Hover row:  text-stone-700 hover:bg-stone-50
```

Change from current: focus border from `neutral-400` → `amber-400` (accent color on focus).

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

- Hero section with serif heading, warm background
- Featured ragas grid (top ragas by song count) with amber hover cards
- Browse category cards (Ragas, Artists, Films) with entity-colored borders
- Entity legend near browse section — teaches color = entity type

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

**Don't** use sans-serif for page-level headings. Serif (EB Garamond) is the heading font.

**Don't** show redundant entity badges. Example: every song on the "Raga Bhairavi" page already shares that raga — remove the amber "Bhairavi" pill from each song card on that page.

**Don't** overload song cards. Metadata stays on one line: film, year, singer, composer. If it wraps, it's too much.

**Don't** add icons without clear purpose. Icons compete with entity color badges for attention.

**Don't** use gradients, shadows heavier than `shadow-sm`, or border-radius larger than `rounded-lg`.

---

## 10. Checklist Before Shipping UI

Use this for every page or component touched during the design refresh:

- [ ] Background uses warm cream (`#FAF8F3`), not white
- [ ] Page headings use serif font (EB Garamond)
- [ ] All text colors use `stone-*`, not `gray-*` or `neutral-*`
- [ ] Entity links use correct color for their entity type
- [ ] Borders use `stone-200` / `stone-100`
- [ ] Spacing follows the token scale (Section 5)
- [ ] Interactive elements have hover/focus states
- [ ] Focus states use accent color (`amber-400` border)
- [ ] Musical notation uses `font-mono tracking-widest`
- [ ] Max 3 text sizes per visual section
- [ ] No redundant entity badges on single-entity pages
- [ ] Mobile responsive (test at 375px width)
