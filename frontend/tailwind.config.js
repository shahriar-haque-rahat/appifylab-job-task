/**
 * Tailwind theme — NOT a new design system.
 *
 * Every value below is lifted straight from the provided template's own CSS so
 * that utility classes reproduce the original design instead of Tailwind's
 * default palette/scale:
 *   - colors  ← the `:root { --color*, --bg*, --bcolor* }` block in common.css
 *              (plus the handful of component grays the template uses inline)
 *   - fontFamily ← `body { font-family: 'Poppins', sans-serif }` in common.css
 *   - boxShadow  ← the dropdown/panel shadows used by the feed widgets
 *
 * Spacing and border-radius are intentionally left as Tailwind's defaults: the
 * template's recurring values already line up with them (6px = rounded-md,
 * 8px = rounded-lg, and its 4px-based margins/paddings map 1:1 onto the default
 * 0.25rem step — e.g. 8px = 2, 12px = 3, 24px = 6, 44px = 11).
 *
 * Loaded by app/globals.css via `@config`. Preflight is intentionally NOT
 * enabled, so these tokens/utilities layer on top of the template rules that now
 * live (tree-shaken) inside the `@layer template` block of globals.css.
 */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand blue — common.css --color5, reused everywhere for links/actions.
        primary: "#1890ff",
        "primary-hover": "#177ede", // template hover shade for the blue

        // Dark heading / text ramp (common.css --bg5, --bg6, --color, --color1, --color4).
        heading: "#112032",
        "heading-2": "#232e42",
        ink: "#2d3748",
        "ink-strong": "#1a202c",
        "ink-soft": "#4a5568",

        // Secondary / muted greys used by the feed components and icon strokes.
        muted: "#65676b",
        "muted-2": "#8a8a8a",
        "muted-3": "#666666", // --color7
        faint: "#c4c4c4", // --color3 (dots / placeholder icons)

        // Surfaces & borders (common.css --bg1/--bg3, --color9, component lines).
        surface: "#f0f2f5", // --bg1 / --bcolor1
        "surface-2": "#f5f5f5", // --bg3
        "surface-3": "#f5f7fa", // vis-btn hover
        "active-surface": "#e8f4ff", // --color9
        line: "#e4e6eb", // component borders
        "line-2": "#edeff1", // template borders

        success: "#0acf83", // --color8
        danger: "#ef4444", // inline form-error red (matches the removed globals rule)
      },
      fontFamily: {
        // Matches `body { font-family: 'Poppins', sans-serif }`. Poppins itself is
        // still loaded via the Google Fonts <link> in app/layout.tsx, exactly as
        // the original template does (the files in public/fonts/ are the icon
        // fonts — FontAwesome / Flaticon — not the body typeface).
        sans: ["Poppins", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Panel shadows carried over 1:1 from the removed globals component CSS.
        dropdown: "0px 6px 18px rgba(0, 0, 0, 0.12)",
        "dropdown-lg": "0px 8px 24px rgba(0, 0, 0, 0.14)",
      },
      animation: {
        // Match the template spinner's 0.7s (Tailwind's default `animate-spin`
        // is 1s); reuses Tailwind's built-in `spin` keyframes.
        spin: "spin 0.7s linear infinite",
      },
    },
  },
  plugins: [],
};
