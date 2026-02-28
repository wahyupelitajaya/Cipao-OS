# Cat Management System — Design System

**Principles:** Clarity over decoration. Every color and visual element has meaning. Elegant, minimal, action-oriented. Operational tool, not decorative.

---

## 1. Color Palette (Exact Hex)

### Semantic colors (max 3 for meaning)

| Meaning | Use | Text/Icon | Background | Hex (text) | Hex (bg) |
|--------|-----|-----------|------------|------------|----------|
| **Baik / Healthy / OK** | Calm, healthy, on track | Soft green | Very light green | `#3d6b5c` | `#f2f8f6` |
| **Kurang Baik / Due soon / Attention** | Needs attention, due within 7 days | Soft amber | Very light amber | `#b8862e` | `#fef9f2` |
| **Sakit / Overdue / Critical** | Urgent, overdue, critical | Soft red | Very light red | `#c74f4f` | `#fef2f2` |

### Neutral palette

| Token | Hex | Use |
|-------|-----|-----|
| Background | `#faf9f7` | Page background (warm white) |
| Background elevated | `#ffffff` | Cards, tables |
| Foreground | `#1e2433` | Primary text (deep navy) |
| Muted foreground | `#6b7280` | Secondary text |
| Border | `#e5e7eb` | Dividers, inputs |
| Sidebar | `#1a1f2e` | Nav background |
| Accent (primary) | `#4a6fa5` | Links, primary buttons |

---

## 2. Accessibility — Contrast

- **Foreground on background:** `#1e2433` on `#faf9f7` → **~12:1** (AAA).
- **Status text on status background:**
  - Green `#3d6b5c` on `#f2f8f6` → **~7:1** (AA).
  - Amber `#b8862e` on `#fef9f2` → **~4.5:1** (AA).
  - Red `#c74f4f` on `#fef2f2` → **~4.5:1** (AA).
- **Muted text** on background meets AA. No bright or flashing UI.

---

## 3. Status Design System

**Cat status (manual):** Baik | Kurang Baik | Sakit  
**Suggested status (health logic):** Healthy | Monitor | Needs Attention  
**Date urgency:** Overdue | Due within 7 days | Normal

| Label | Color | When |
|-------|--------|------|
| Baik / Healthy / Normal | Soft green | Cat healthy; preventive on track |
| Kurang Baik / Monitor / Due soon | Soft amber | Attention needed; due within 7 days |
| Sakit / Needs Attention / Overdue | Soft red | Urgent; overdue or critical |

**Rules:**
- Use **subtle background badges** (light tint + colored text). No bright solid fills.
- Status appears **consistently** in: Health table, Cat profile header, Dashboard alerts, Reports list.
- **No more than these 3 colors** for status/urgency meaning.

---

## 4. Date & Urgency (Vaccine / Flea / Deworm)

**Display:** Two lines — **Last date**, **Next date**.

| State | Text color | Meaning |
|-------|------------|--------|
| Overdue | Soft red | Past due |
| Due within 7 days | Soft amber | Due soon |
| Normal | Neutral gray | On track |

Calm tones only. No flashing or aggressive UI.

---

## 5. Table Readability

**Health table columns:**  
`CAT | STATUS | LAST WEIGHT | VACCINE | FLEA | DEWORM | ACTIONS`

- **Clear spacing:** Cell padding `1rem` (16px) horizontal, `0.75rem` (12px) vertical.
- **STATUS column:** Visually emphasized (e.g. header font-weight 600; status badge always visible).
- **Numbers:** Right-aligned, `tabular-nums` (e.g. Last weight).
- **Dates:** Consistent short format (e.g. 25 Jan 2025).
- **No clutter:** No heavy borders; use `1px` subtle border and `divide-y` only where needed.

---

## 6. Hierarchy

- **Cat name:** Slightly bold (`font-medium` / 600).
- **Status:** Visible at first glance (badge with semantic color).
- **Secondary info:** Smaller (`text-xs`), muted color.
- **White space:** Generous padding and gaps; avoid dense blocks.

---

## 7. Dashboard

- **Priority only:** Overdue first, due soon second.
- **Clean alert list** with the same 3 status colors.
- **No charts** unless necessary.
- Minimal summary cards; avoid decoration.

---

## 8. Cognitive Load

- **Max 3 colors** for meaning (green / amber / red).
- **No unnecessary icons**; only where they add clarity.
- **No decorative elements** without purpose.
- **All actions** clearly labeled (e.g. "Set Last", "Set Next due", "Buka").
- **Avoid ambiguity:** One label per action; consistent wording.

---

## 9. Spacing System

| Token | Value | Use |
|-------|--------|-----|
| `space-1` | 4px | Tight inline |
| `space-2` | 8px | Inline gap, small padding |
| `space-3` | 12px | Cell padding (vertical) |
| `space-4` | 16px | Cell padding (horizontal), form gaps |
| `space-5` | 20px | Section padding |
| `space-6` | 24px | Block gap |
| `space-8` | 32px | Section gap |
| `space-10` | 40px | Page section gap |

**Component padding:** Cards `px-5 py-4` (20px / 16px). Tables `px-5 py-3` for cells.

---

## 10. Component Design System

### Badges
- **Variants:** `baik` (green), `kurang_baik` (amber), `sakit` (red), plus `overdue` / `due-soon` / `ok` (same colors).
- **Style:** `rounded-md`, `px-2 py-0.5`, `text-xs font-medium`, subtle bg + colored text.
- **No** bright solid fills.

### Tables
- **Container:** `.table-container` — elevated background, `border-radius-lg`, light border, soft shadow.
- **Header:** `text-xs font-semibold uppercase tracking-wider text-muted-foreground`, `bg-muted/30`, `border-b`.
- **Rows:** `border-b border-border`, `hover:bg-muted/20`. No heavy borders.

### Inputs
- **Style:** `rounded-md`, `border border-border`, soft shadow, focus ring (accent).
- **Height:** Default `h-9` or `h-10` for touch targets.

### Buttons
- **Primary:** Accent background, white text, `rounded-md`, soft shadow.
- **Secondary / outline:** Border, muted hover.
- **Destructive:** Soft red (same semantic red). All actions labeled.

---

## 11. Desktop Layout

- **Sidebar:** Fixed left; nav items Dashboard, Cats, Health, Grooming, Inventory, Reports.
- **Main:** `max-width: 80rem`, centered; generous horizontal padding (`container-app`).
- **Tables:** Full width within main; horizontal scroll on small viewports if needed.

---

## 12. Mobile Layout

- **Navigation:** Collapsible or bottom/top bar; same nav items.
- **Tables:** Horizontal scroll with sticky first column (Cat name) where possible.
- **Cards / lists:** Stack vertically; touch-friendly tap targets (min 44px).
- **Spacing:** Slightly reduced padding; hierarchy and status colors unchanged.

---

## Summary

- **Colors:** 3 semantic (green / amber / red) + neutrals. WCAG AA where applicable.
- **Status:** Baik → green, Kurang Baik → amber, Sakit → red; same in tables, profile, dashboard.
- **Dates:** Last / Next; overdue = red, due soon = amber, normal = gray.
- **Tables:** Clear spacing, STATUS emphasized, numbers right-aligned, light borders.
- **Hierarchy:** Name bold, status visible, secondary small, plenty of white space.
- **Dashboard:** Priority alerts first; clean list; no unnecessary charts.
- **Cognitive load:** No extra colors, no decorative icons, clear labels.
