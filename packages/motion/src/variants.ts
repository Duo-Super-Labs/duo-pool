import type { Variants } from "framer-motion";

/**
 * Generic content reveal — fade in while sliding up 16px.
 * Use on cards, list items, or any block that should "settle" into place
 * after layout. Pair with `initial="hidden"` and `animate="visible"`.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

/**
 * Page-level transition for navigating between vote screen and result screen.
 * Wrap each screen in <AnimatePresence mode="wait"> and animate between
 * `enter` → `center` → `exit`.
 *
 * The `[0.16, 1, 0.3, 1]` curve is the "expo-out" easing — quick takeoff,
 * gentle landing, which reads as deliberate without feeling sluggish.
 */
export const screenSwap: Variants = {
  enter: { opacity: 0, x: 24 },
  center: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
  exit: {
    opacity: 0,
    x: -24,
    transition: { duration: 0.2 },
  },
};

/**
 * Press affordance for the upcoming <HoldButton>. Two states only:
 *  - `idle`: at rest (scale 1)
 *  - `holding`: subtle squish on press (scale 0.98) with a gentle bounce
 *
 * NOTE: this variant only animates the press feel — it deliberately does NOT
 * drive the fill-percentage progress. The button's left-to-right gradient
 * fill is driven by a CSS custom property (`--progress`) updated from a
 * pointer-events handler, not by Framer Motion. Keeping the progress in CSS
 * lets the animation remain frame-perfect even if the React tree re-renders,
 * and avoids spamming Framer with per-frame variant changes.
 */
export const holdProgress: Variants = {
  idle: {
    scale: 1,
    transition: { duration: 0.15, ease: "easeOut" },
  },
  holding: {
    scale: 0.98,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 18,
      mass: 0.6,
    },
  },
};
