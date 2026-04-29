"use client";

import { motion } from "@duopool/motion";
import { screenSwap } from "@duopool/motion/variants";
import { usePollResults } from "../api";

interface Props {
  slug: string;
  youVotedOptionId?: string;
}

/**
 * Fullscreen, dramatic result screen for a poll. The "show" view that the
 * audience sees on their phone after voting.
 *
 * - Live badge + total at the top, with a pulsing dot
 * - Leader's percentage centered in huge type
 * - Thin progress bar at the leader's percentage
 * - Runner-up shown muted at the bottom
 * - Optional "✓ Você votou X" footer when `youVotedOptionId` is provided
 *
 * Polls every 2s via `usePollResults` (existing hook).
 */
export function ResultStage({ slug, youVotedOptionId }: Props) {
  const { data, isLoading } = usePollResults(slug);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6 px-4">
        <div className="h-6 w-40 rounded-md bg-muted animate-pulse" />
        <div className="h-32 w-3/4 max-w-2xl rounded-md bg-muted animate-pulse" />
        <div className="h-1 w-3/4 max-w-2xl rounded-full bg-muted animate-pulse" />
        <div className="h-4 w-48 rounded-md bg-muted animate-pulse" />
      </div>
    );
  }

  if (data.total === 0) {
    return (
      <motion.div
        variants={screenSwap}
        initial="enter"
        animate="center"
        className="flex min-h-[80vh] flex-col items-center justify-center gap-4 px-4 text-center"
      >
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          {data.question}
        </p>
        <p className="text-2xl font-semibold text-muted-foreground">
          Aguardando primeiro voto…
        </p>
      </motion.div>
    );
  }

  const sorted = [...data.options].sort((a, b) => b.count - a.count);
  const leader = sorted[0];
  const runnerUp = sorted[1];

  if (!leader) {
    return null;
  }

  const votedOption = youVotedOptionId
    ? data.options.find((o) => o.optionId === youVotedOptionId)
    : undefined;

  return (
    <motion.div
      variants={screenSwap}
      initial="enter"
      animate="center"
      className="flex min-h-[80vh] flex-col items-center justify-between gap-8 px-4 py-12"
    >
      {/* Top: live badge */}
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <motion.span
          aria-hidden="true"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY }}
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: "var(--pulse-live, var(--secondary))" }}
        />
        <span>
          AO VIVO · {data.total} {data.total === 1 ? "VOTO" : "VOTOS"}
        </span>
      </div>

      {/* Center: leader stat */}
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          {data.question}
        </p>
        <p className="font-black tracking-tighter leading-none text-[clamp(56px,16vw,128px)] text-primary">
          {leader.percentage.toFixed(0)}%
        </p>
        <p className="text-xl font-semibold sm:text-2xl">{leader.label}</p>
        {/* Thin progress bar at the leader's percentage */}
        <div className="mt-2 h-1 w-[80%] max-w-2xl overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${leader.percentage}%` }}
          />
        </div>
      </div>

      {/* Footer: runner-up + "you voted" */}
      <div className="flex flex-col items-center gap-2 text-center">
        {runnerUp ? (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium">{runnerUp.label}</span>{" "}
            <span className="tabular-nums">
              {runnerUp.percentage.toFixed(0)}%
            </span>
          </p>
        ) : null}
        {votedOption ? (
          <p className="text-xs text-muted-foreground">
            ✓ Você votou {votedOption.label}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
