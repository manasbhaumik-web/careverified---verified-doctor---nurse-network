# Unified Design System & UI/UX Specifications

## Platform: MedCred / CareVerified – Verified Doctor & Nurse Network
**Version:** 3.0  
**Design Paradigm:** High-Density Institutional Medical Ergonomics (Clinical Precision Standard)  
**Core Geometry:** Strict Zero-Border-Radius (`rounded-none`) · Rectangular Structural Integrity  
**Accessibility Level:** WCAG 2.1 / 2.2 AA Compliant  

---

## 1. Design Philosophy & Architectural Vision

MedCred is engineered for high-stakes healthcare operations where cognitive clarity, rapid scanning, and institutional trust are non-negotiable. The design system rejects consumer-grade rounded bubbly aesthetics in favor of **clinical precision, geometric sharpness, and high-density information architecture**.

### Core Tenets
1. **Zero-Border-Radius Structural Integrity:** All containers, cards, dialogs, drawers, buttons, form fields, and imagery maintain strictly rectangular geometry (`0px` / `rounded-none`). Rounded corners are reserved exclusively for live telemetry pulse indicators, circular status dots, and explicit micro-signals.
2. **Three-Layer Token Hierarchy:** Clear separation of Primitives, Semantic System Tokens, and Component Specifications ensuring dynamic theme adaptability without style fragmentation.
3. **Institutional Authority:** Visual styling inspired by national medical council gazettes, hospital operating theater dashboards, and regulatory audit terminals.
4. **Cognitive Fatigue Mitigation:** Monospaced tabular numerics (`font-mono tabular-nums`), high-contrast alert badges, and explicit statutory banners that eliminate clinical ambiguity during consultations.

---

## 2. Three-Layer Token Architecture

```
Layer 1: PRIMITIVES
  ├── Core Hues (Cyan, Sky, Crimson, Emerald, Amber, Slate)
  ├── Base Scales (50..950)
  └── Raw Typography Font Stacks (Inter)
           │
           ▼
Layer 2: SEMANTIC SYSTEM TOKENS
  ├── --sys-bg-hero, --sys-border-hairline, --sys-text-primary
  ├── --t-50..900 (Active Theme Spectrum)
  └── Role Tone Accents (brand, success, warning, neutral, urgent)
           │
           ▼
Layer 3: COMPONENT SPECIFICATIONS
  ├── Form Controls (.form-input, .form-select)
  ├── Institutional Banners (DashboardHeader, BannerRow)
  └── Clinical Action Buttons (Primary, Danger, Secondary, Neutral)
```

### 2.1 Layer 1: Primitive Tokens

#### Neutral Modern Slate Palette
```css
--color-slate-50:  #F8FAFC;  /* Canvas background & muted card fills */
--color-slate-100: #F1F5F9;  /* Secondary pill backdrops & input fills */
--color-slate-200: #E2E8F0;  /* Standard structural borders */
--color-slate-300: #CBD5E1;  /* Focus rings & active boundaries */
--color-slate-400: #94A3B8;  /* Placeholder text & secondary icons */
--color-slate-500: #64748B;  /* Metadata labels & explanatory subtext */
--color-slate-600: #475569;  /* Secondary body copy */
--color-slate-700: #334155;  /* Table headers & primary body copy */
--color-slate-800: #1E293B;  /* High-contrast headings */
--color-slate-900: #0F172A;  /* Deep dark surfaces & terminal headers */
--color-slate-950: #020617;  /* High-emphasis black surfaces */
```

#### Clinical Accent Primitives
* **Clinical Emerald (Accreditation & Success):** `#059669` (Dark: `#047857`, Mint: `#ECFDF5`, Border: `#A7F3D0`)
* **Regulatory Amber (Warning & SLA Urgency):** `#D97706` (Bg: `#FFFBEB`, Border: `#FDE68A`, Text: `#92400E`)
* **Statutory Rose / Crimson (Emergency & Sanctions):** `#BE183D` (Bg: `#FFF1F2`, Border: `#FECDD3`, Text: `#9F1239`)

### 2.2 Layer 2: Semantic Theme Spectrum (`data-theme`)
The platform supports three distinct institutional colorways selectable via `<html data-theme="...">`:

| Token | Light Cyan (Default Clinic) | Sky (Oceanic Medical) | Crimson (Emergency & Council) |
| :--- | :--- | :--- | :--- |
| `--t-50` | `#ECFEFF` | `#F0F9FF` | `#FFF0F2` |
| `--t-100` | `#CFFAFE` | `#E0F2FE` | `#FFE4E6` |
| `--t-200` | `#A5F3FC` (Hairlines) | `#BAE6FD` (Hairlines) | `#FECDD3` (Hairlines) |
| `--t-500` | `#06B6D4` | `#0EA5E9` | `#E0243F` |
| `--t-600` | `#0891B2` (Primary Brand) | `#0270A9` (Primary Brand) | `#C81E1E` (Primary Brand) |
| `--t-700` | `#0E7490` (Hover State) | `#0369A1` (Hover State) | `#B91C1C` (Hover State) |
| `--t-800` | `#155E75` (Dark Headers) | `#075985` (Dark Headers) | `#86102A` (Dark Headers) |
| `--t-bg` | `#F2FDFF` | `#F5FAFF` | `#FFF8F9` |

### 2.3 Layer 3: Typography System
* **Display & Body Font:** Inter (`'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif`) across all screen types.
* **Monospaced Figures:** Monospaced tabular numerics (`font-mono tabular-nums`) applied to:
  * Medical council license numbers (`MMC-12345`, `LJM-67890`)
  * Blood pressure, heart rate, and temperature vital readings
  * Financial currency figures (e.g., `RM 150.00`, `$ 45.00`)
  * Real-time lease countdown timers (`14:59`)
  * Audit log SHA-256 signatures and timestamps

#### Type Scale & Hierarchy
| Level | Font Size | Line Height | Weight | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display H1** | 2rem (32px) / 2.5rem (40px) | 1.15 | 800 (Extrabold) | `-0.025em` | Hero landing banners, main workspace titles |
| **Workspace H2** | 1.5rem (24px) / 1.75rem (28px)| 1.25 | 800 (Extrabold) | `-0.02em` | Section headers, modal panel titles |
| **Card H3** | 1.125rem (18px) | 1.35 | 700 (Bold) | `-0.01em` | Widget headers, consultation patient names |
| **Subhead H4** | 0.875rem (14px) | 1.45 | 700 (Bold) | `0em` | Form group labels, table card subtitles |
| **Body Primary**| 0.875rem (14px) | 1.5 | 500 (Medium) | `0em` | Patient notes, prescription directions |
| **Body Small** | 0.75rem (12px) | 1.45 | 500 (Medium) | `0.01em` | Regulatory footnotes, secondary metadata |
| **Eyebrow / Tag**| 0.625rem (10px) / 0.6875rem (11px)| 1.2 | 800 (Black) | `0.08em` | Uppercase badge labels, council categories |

---

## 3. Geometric Rules & Shape Hierarchy

```
┌────────────────────────────────────────────────────────────────────────┐
│                        SHAPE INTEGRITY DIRECTIVE                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. ALL CONTAINERS, BUTTONS, INPUTS, DIALOGS, CARDS, IMAGES:           │
│    border-radius: 0px !important; (Strictly Rectangular)              │
│                                                                        │
│ 2. EXPLICIT EXCEPTIONS ONLY:                                           │
│    border-radius: 9999px !important;                                  │
│    - Status Indicators (.status-dot, .live-dot)                        │
│    - Blinking Pulse Rings (.animate-pulse, .animate-ping)              │
│    - Circular User Avatars (.rounded-full)                            │
└────────────────────────────────────────────────────────────────────────┘
```

### 3.1 The Zero-Border-Radius Rule (`rounded-none`)
* **Strict Rectangularity:** The application enforces `border-radius: 0px !important` globally across buttons, inputs, selects, textareas, headers, cards, modals, and image thumbnails.
* **Prohibition of Oval Imagery:** Hero image sections, doctor passport headshots, and clinic photography are displayed in crisp rectangular frames. Capsular or elliptical clipping is prohibited.
* **Circular Exceptions:** Only micro-status dots (green online indicator, live queue pulse rings) and passport ID headshots explicitly designated with `.rounded-full` render as circular elements.

### 3.2 Border Enforcement System
Generic gray borders (`#000000`, generic `#e5e7eb`) are intercepted and re-mapped to semantic theme border tokens:
* Hairlines & Dividers: `var(--t-100)`
* Standard Card Borders: `var(--t-200)`
* Interactive Hover Borders: `var(--t-300)`
* Dark Surface Dividers: `var(--t-700)` / `var(--t-800)`

---

## 4. Component Design Patterns

### 4.1 Institutional Header Banner (`DashboardHeader.tsx`)
The top landmark across all user portals (Patient, Practitioner, Pharmacy, Facility, Admin) is standardized as a high-density, full-bleed institutional banner:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Avatar] Datin Dr. Sharifah Halimah  [SUPER-ADMIN] [AUDIT TERMINAL] [Lease: 14:32] [Switch]     │
│ National Medical Council Board · Full Statutory Oversight (Act 50, Act 586, MOH)                │
│                                                   [12 Pending] [148 Verified] [3 Modules]        │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Approvals (12)] [Trust & Complaints (1)] [Directory]          [Audit] [Webhooks] [Role] [Help]  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Key Sub-Components
* **`BannerIdentity`:** Displays practitioner/admin passport headshot, legal name, role badges, and statutory authority description.
* **`BannerBadge`:** High-contrast metadata tag supporting semantic tones:
  * `brand`: Theme primary background with high-contrast text.
  * `success`: Emerald background with green indicator dot.
  * `warning`: Amber background for license expiration warnings.
  * `urgent`: Flashing red background for statutory disciplinary orders.
* **`BannerKpis`:** Compact tabular statistic counters displaying queue volumes and verified cohorts.
* **Integrated Tab Navigation:** Sub-workspace tabs directly attached to the bottom rim of the header, preventing visual seams.

### 4.2 Workspace Sub-Header (`WorkspaceHeader.tsx`)
Used inside tab panels to introduce sub-modules with structured visual hierarchy:
* **Eyebrow:** Monospaced 10px uppercase tracking badge (e.g. `MEDICAL COUNCIL GOVERNANCE · REGULATORY VERIFICATION`).
* **Title:** Bold 20px heading with associated category icon.
* **Description:** Crisp 13px slate subtext explaining the statutory mandate of the view.
* **Badges:** Statutory oversight pill tags and action buttons aligned to the right.

### 4.3 Form Controls & Input Standards
* **Height:** Fixed standard height of `48px` (`min-height: 48px`) across inputs and dropdown selects to satisfy touch accessibility.
* **State Styling:**
  * Default: `border: 1px solid var(--t-200); background: var(--t-bg);`
  * Focus: `border-color: var(--t-600); box-shadow: 0 0 0 1px var(--t-600); outline: none;`
  * Error: `border-color: #E11D48; background: #FFF1F2;`
* **Textarea:** Minimum height `88px` with vertical resize capability and 16px minimum mobile font size to eliminate iOS viewport auto-zoom.

### 4.4 Buttons & Interactive Controls
| Button Variant | CSS Classes | Visual Appearance | Clinical Context |
| :--- | :--- | :--- | :--- |
| **Primary Statutory** | `bg-[color:var(--t-600)] hover:bg-[color:var(--t-700)] text-white text-xs font-bold uppercase tracking-wider rounded-none px-5 h-10` | Bold theme-colored fill, sharp corners | "Approve & Publish", "Countersign & Enforce", "Sign and Issue Rx" |
| **Critical / Danger** | `bg-rose-700 hover:bg-rose-800 text-white text-xs font-black uppercase tracking-wider rounded-none px-4 h-10` | High-contrast crimson fill | "Suspend Practitioner", "Immediate Inquest", "Revoke APC" |
| **Secondary White** | `bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold uppercase tracking-wider rounded-none px-4 h-10` | Crisp white card with slate boundary | "Dismiss Proposal", "Cancel Changes", "Download Audit CSV" |
| **Ephemeral Lease Warning** | `bg-amber-400 text-slate-950 border border-amber-500 text-xs font-black uppercase animate-pulse px-2.5 py-1` | High-visibility warning pill with countdown | "Break-Glass Lease: MM:SS [Revert]" |

---

## 5. Module-Specific UI Layouts

### 5.1 Clinician Split-Screen Heads-Up Display (HUD)
Implemented in [`ConsultRoom.tsx`](file:///c:/Users/Manas/.gemini/antigravity/scratch/careverified---verified-doctor---nurse-network/src/components/ConsultRoom.tsx):

```
┌──────────────────────────────────────────┬──────────────────────────────────────────┐
│              LIVE MEDIA HUD              │       CLINICAL CHARTING WORKSPACE        │
│  ┌────────────────────────────────────┐  │  Patient: En. Ahmad Razak (42 M) · MyKad │
│  │                                    │  │  Chief Complaint: Acute fever & cough    │
│  │                                    │  ├──────────────────────────────────────────┤
│  │         Encrypted WebRTC           │  │  SOAP ENCOUNTER NOTES                    │
│  │         Video Media Stream         │  │  [S] Patient reports 38.5C fever x 3d... │
│  │                                    │  │  [O] HR: 88 bpm · SpO2: 98% · BP: 120/80 │
│  │                                    │  │  [A] J06.9 Acute upper respiratory infect│
│  └────────────────────────────────────┘  │  [P] Rest, oral hydration, paracetamol   │
│  [Mute Mic] [Stop Video] [End Call]      ├──────────────────────────────────────────┤
│  Live Vitals: HR 88 bpm · SpO2 98%       │  [Sign & Issue Rx] [Order Labs] [Close]  │
└──────────────────────────────────────────┴──────────────────────────────────────────┘
```

### 5.2 Regulatory Dual-Signoff Inbox Widget
Mounted in [`AdminDashboard.tsx`](file:///c:/Users/Manas/.gemini/antigravity/scratch/careverified---verified-doctor---nurse-network/src/components/AdminDashboard.tsx) for four-eyes disciplinary oversight:
* **Warning Card:** `#FFFBEB` background with a solid `2px` Amber-500 border.
* **Badge:** Amber-600 badge indicating `{N} Action Required`.
* **Statutory Notice:** Highlights compliance with Malaysian Medical Act 1971 Section 29.
* **Action Cluster:** Pair of "Dismiss Proposal" (white card button) and "Countersign & Enforce" (Rose-700 high-visibility button).

---

## 6. Accessibility & Responsiveness Specifications

### 6.1 WCAG 2.1 / 2.2 Level AA Directives
* **Contrast Ratios:**
  * Normal text (14px): Minimum contrast ratio of **4.5:1** against backgrounds.
  * Large headings (18px+ bold): Minimum contrast ratio of **3.0:1**.
  * Form field boundaries: Minimum contrast ratio of **3.0:1** against container fills.
* **Keyboard Navigation:** Full focus trap in modals (`SanctionsDrawer.tsx`, `ReviewActions`), tab navigation via arrow keys and `Tab` traversal, and `Escape` key close handlers.
* **Screen Reader Accessibility:**
  * `aria-expanded` on accordion drawers and mobile menu toggles.
  * `aria-pressed` on microphone and camera media mute buttons.
  * `aria-live="polite"` on teleconsultation queue telemetry updates.

### 6.2 Responsive Breakpoint Matrix

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┐
│     Mobile Viewport     │     Tablet Viewport     │    Desktop Viewport     │
│       (< 768px)         │     (768px - 1024px)    │       (> 1024px)        │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ • Bottom navigation bar │ • Condensed header      │ • Full institutional    │
│ • Stacked HUD layout    │ • 2-column card layouts │   horizontal banner     │
│ • Full-screen modals    │ • Side drawer navigation│ • Split-Screen HUD      │
│ • 44px min tap targets  │ • Collapsible queues    │ • 1920px max-width      │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

---

## 7. Motion & Interaction Standards

* **Page Transitions:** Low-duration smooth opacity fade-ins (`duration: 0.18s, ease: "easeOut"`).
* **Hero Image Ken Burns Motion:** Subtle continuous ambient zoom (`scale(1.0) -> scale(1.08)`) with a 24-second ease-in-out cycle.
* **Reduced Motion Compliance:**
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
  ```
