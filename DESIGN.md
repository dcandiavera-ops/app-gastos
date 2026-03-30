# Design System Specification: High-End Financial Editorial

## 1. Overview & Creative North Star: "The Ethereal Vault"
This design system moves away from the rigid, utilitarian nature of traditional finance apps. Our Creative North Star is **"The Ethereal Vault"**—a digital space that feels both infinitely deep and weightlessly light. 

By 2026, user interfaces must transcend "flatness." We achieve this through **Fluid Spatial Layouts** and **Soft Bento Grids**. We break the "template" look by using intentional asymmetry—where a large data visualization might occupy a 2x2 bento slot while a tiny, high-contrast action chip floats in a corner—creating an editorial rhythm that guides the eye through financial narratives rather than just rows of data.

---

## 2. Typography: Editorial Hierarchy
We utilize a dual-font strategy to balance authority with modern readability.

*   **Display & Headlines (Manrope):** Chosen for its geometric precision. 
    *   *Application:* Use `display-lg` (3.5rem) for total balance figures. The large scale conveys importance without needing "bold" weights.
*   **Body & Labels (Inter):** Chosen for its extreme legibility at small scales.
    *   *Application:* Use `body-md` for transaction descriptions and `label-sm` for timestamps. 

**Hierarchy Strategy:** Brand identity is conveyed through extreme contrast. Pair a `headline-lg` title with a `label-md` uppercase subtitle (using `outline` color) to create an "Editorial Header" style for bento sections.

---

## 3. Colors & Surface Philosophy
The palette is rooted in a deep, nocturnal foundation, punctuated by high-frequency accents that signify "digital life."

*   **Color Mode:** DARK
*   **Background/Surface:** `#060e20` (A deep, ink-navy base)
*   **Primary (Digital Mint):** `#aaffdc` (Used for growth, positive trends, and primary actions)
*   **Secondary (Electric Violet):** `#bf81ff` (Used for luxury spending, alerts, or secondary data points)
*   **Tertiary (Cyan Burst):** `#69daff` (Used for utility and informational highlights)
*   **Error:** `#ff716c`

### The "No-Line" Rule
**Strict Mandate:** Traditional 1px solid borders are prohibited for sectioning. Boundaries must be defined solely through:
1. **Background Shifts:** Placing a `surface-container-low` card against the `background` base.
2. **Tonal Transitions:** Using subtle `surface-container-highest` headers to separate content.
3. **Negative Space:** Relying on the `spacing-6` (2rem) or `spacing-8` (2.75rem) tokens to create "air" between functional blocks.

### The "Glass & Gradient" Rule
To achieve a premium, custom feel, use `surface-variant` at 40% opacity with a `backdrop-blur` of 20px for floating bento cards. Main Call-to-Actions (CTAs) should utilize a linear gradient from `primary` (`#aaffdc`) to `primary-container` (`#00fdc1`) at a 135-degree angle to provide "visual soul."

---

## 4. Components & Spatial Patterns

### Bento Cards & Lists
*   **Radius:** ROUND_FULL, apply `rounded-lg` (2rem) to all bento cards. For internal nested elements (like a "Spend" button inside a card), use `rounded-md` (1.5rem) to create visual harmony.
*   **The Rule:** No dividers. Separate list items using a `0.5rem` (spacing-1.5) vertical gap and a subtle background shift on hover/active states.

### Input Fields
*   **Style:** "Submerged" inputs. Use `surface-container-lowest` (#000000) with a `ghost border`. 
*   **Focus State:** Transition the border to `primary` (100% opacity) and add a subtle `primary-dim` outer glow (4px blur).

### Buttons
*   **Primary:** Gradient (`primary` to `primary-container`), black text (`on-primary-fixed`), `rounded-full`.
*   **Secondary (Glass):** `surface-variant` at 20% opacity, `backdrop-blur`, `on-surface` text.
*   **Tertiary:** No background. `primary` text color with a `label-md` weight.

### Data Visualization (Bespoke Trend Lines)
*   Charts should never use "hard" points. Use Catmull-Rom splines for fluid curves.
*   Fill the area under the curve with a gradient: `primary` at 20% opacity fading to 0% at the baseline.

---

## 5. Elevation & Depth: Tonal Layering
Depth in this system is not a drop-shadow; it is a physical stacking of light-refracting surfaces.

### The Layering Principle
Hierarchy is achieved by nesting surface tokens:
*   **Base Level:** `surface` (#060e20)
*   **Bento Sections:** `surface-container-low` (#091328)
*   **Floating Active Cards:** `surface-container-high` (#141f38)
*   **Interactive Modals:** `surface-container-highest` (#192540) with 60% opacity.

### Ambient Shadows & "Ghost Borders"
*   **Shadows:** Use only for the highest level of elevation (modals). Color: `on-surface` at 4% opacity. Blur: 40px. Spread: -5px.
*   **The Ghost Border:** For accessibility on cards, use `outline-variant` (#40485d) at **15% opacity**. It should be felt, not seen.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use `display-lg` for the primary monetary value on the dashboard; let the typography be the "hero" image.
*   **Do** use `secondary` (Electric Violet) sparingly as a "heartbeat" accent for over-budget warnings or premium features.
*   **Do** treat every bento grid cell as an independent container with its own internal padding (`spacing-4`).

### Don’t:
*   **Don’t** use pure white (`#FFFFFF`) for text. Always use `on-surface` (`#dee5ff`) to maintain the sophisticated dark-mode atmosphere.
*   **Don’t** use `rounded-none`. In 2026, sharp corners feel aggressive and dated.
*   **Don’t** use 100% opaque card backgrounds. Always allow at least 5% of the underlying background color to bleed through via semi-transparency to maintain "depth."

---

## 7. Token Reference Summary
| Concept | Token / Value |
| :--- | :--- |
| **Grid Radius** | `rounded-lg` (2rem / 32px) |
| **Bento Padding** | `spacing-5` (1.7rem) |
| **Standard Blur** | `backdrop-filter: blur(20px)` |
| **Title Color** | `on-surface` (#dee5ff) |
| **Subtitle Color** | `on-surface-variant` (#a3aac4) |
| **Active Accent** | `primary` (#aaffdc) |
