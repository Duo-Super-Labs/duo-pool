"use client";

import { motion } from "@duopool/motion";
import { holdProgress } from "@duopool/motion/variants";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface HoldButtonProps {
  label: string;
  accent?: "primary" | "secondary";
  onCommit: () => void | Promise<void>;
  holdMs?: number;
  disabled?: boolean;
}

const RELEASE_REVERSE_MS = 150;

/**
 * HoldButton — primitive hold-to-commit gesture.
 *
 * The fill (`linear-gradient(... var(--progress) ...)`) is driven by an inline
 * `--progress` CSS variable updated from a `requestAnimationFrame` loop.
 * Framer Motion only owns the press-scale variant (`holdProgress`), per spec.
 */
export function HoldButton({
  label,
  accent = "primary",
  onCommit,
  holdMs = 1000,
  disabled = false,
}: HoldButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  // Refs that drive the rAF loop — kept out of state so the loop never
  // re-renders mid-frame.
  const startedAtRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const releaseRafRef = useRef<number | null>(null);
  const releaseStartRef = useRef<{ at: number; from: number } | null>(null);
  const committedRef = useRef(false);

  const cancelRaf = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const cancelReleaseRaf = useCallback(() => {
    if (releaseRafRef.current !== null) {
      cancelAnimationFrame(releaseRafRef.current);
      releaseRafRef.current = null;
    }
    releaseStartRef.current = null;
  }, []);

  const animateRelease = useCallback(
    (fromProgress: number) => {
      cancelReleaseRaf();
      if (fromProgress <= 0) {
        setProgress(0);
        return;
      }
      releaseStartRef.current = { at: performance.now(), from: fromProgress };
      const step = (now: number) => {
        const start = releaseStartRef.current;
        if (!start) {
          return;
        }
        const elapsed = now - start.at;
        const ratio = Math.min(elapsed / RELEASE_REVERSE_MS, 1);
        const next = start.from * (1 - ratio);
        setProgress(next);
        if (ratio < 1) {
          releaseRafRef.current = requestAnimationFrame(step);
        } else {
          releaseRafRef.current = null;
          releaseStartRef.current = null;
          setProgress(0);
        }
      };
      releaseRafRef.current = requestAnimationFrame(step);
    },
    [cancelReleaseRaf],
  );

  const startHold = useCallback(() => {
    if (disabled) {
      return;
    }
    cancelRaf();
    cancelReleaseRaf();
    committedRef.current = false;
    setIsHolding(true);
    startedAtRef.current = performance.now();
    setProgress(0);

    const tick = (now: number) => {
      const startedAt = startedAtRef.current;
      if (startedAt === null) {
        return;
      }
      const elapsed = now - startedAt;
      const ratio = Math.min(elapsed / holdMs, 1);
      setProgress(ratio);
      if (ratio >= 1) {
        rafRef.current = null;
        startedAtRef.current = null;
        committedRef.current = true;
        setIsHolding(false);
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.vibrate === "function"
        ) {
          navigator.vibrate(50);
        }
        Promise.resolve()
          .then(() => onCommit())
          .catch(() => {
            // onCommit owns its own error handling; swallow here so the
            // button state machine does not get stuck.
          });
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [cancelRaf, cancelReleaseRaf, disabled, holdMs, onCommit]);

  const cancelHold = useCallback(() => {
    if (committedRef.current) {
      // Already fired; no need to animate back.
      committedRef.current = false;
      setIsHolding(false);
      setProgress(0);
      return;
    }
    cancelRaf();
    startedAtRef.current = null;
    if (!isHolding) {
      return;
    }
    setIsHolding(false);
    // Capture the most recent progress via functional setState so we don't
    // race the React commit cycle.
    setProgress((current) => {
      animateRelease(current);
      return current;
    });
  }, [animateRelease, cancelRaf, isHolding]);

  useEffect(() => {
    return () => {
      cancelRaf();
      cancelReleaseRaf();
    };
  }, [cancelRaf, cancelReleaseRaf]);

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    event.preventDefault();
    startHold();
  };

  const handlePointerUp = () => {
    if (disabled) {
      return;
    }
    cancelHold();
  };

  const handlePointerLeave = () => {
    if (disabled) {
      return;
    }
    cancelHold();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    if (event.key !== " " && event.key !== "Spacebar") {
      return;
    }
    if (event.repeat || isHolding) {
      return;
    }
    event.preventDefault();
    startHold();
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) {
      return;
    }
    if (event.key !== " " && event.key !== "Spacebar") {
      return;
    }
    event.preventDefault();
    cancelHold();
  };

  const accentVar =
    accent === "secondary" ? "var(--secondary)" : "var(--primary)";

  return (
    <motion.button
      type="button"
      role="button"
      aria-pressed={isHolding}
      aria-label={label}
      disabled={disabled}
      variants={holdProgress}
      animate={isHolding ? "holding" : "idle"}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      style={
        {
          "--progress": progress,
          "--accent-color": accentVar,
          backgroundImage: `linear-gradient(90deg, ${accentVar} calc(var(--progress) * 100%), transparent calc(var(--progress) * 100%))`,
        } as React.CSSProperties
      }
      className={cn(
        "relative w-full select-none overflow-hidden border border-border px-6 py-5 text-left text-lg font-medium tracking-wide text-foreground transition-opacity",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "touch-none",
        disabled && "pointer-events-none opacity-40",
      )}
    >
      <span className="relative z-10 mix-blend-difference">{label}</span>
    </motion.button>
  );
}
