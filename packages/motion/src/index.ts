/**
 * @duopool/motion
 *
 * Centralized wrapper around framer-motion. Components in apps/web import
 * `motion`, `AnimatePresence`, and animation variants from this package — never
 * directly from `framer-motion`. This gives us:
 *  - one mock target in tests
 *  - a single place to swap or pin the animation engine
 *  - named, reusable variants (see ./variants)
 */

export { AnimatePresence, motion } from "framer-motion";
export type { MotionProps, Transition, Variants } from "framer-motion";
