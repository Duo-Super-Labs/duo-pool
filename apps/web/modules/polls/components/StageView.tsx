"use client";

import { motion } from "@duopool/motion";
import { screenSwap } from "@duopool/motion/variants";
import { usePollResults } from "../api";

interface Props {
  slug: string;
}

/**
 * Projector / "stage" view. Horizontal 16:9 layout designed for a big screen
 * behind the speaker. Polls every 2s like the phone result, but with no
 * vote chrome and no "you voted" footer.
 */
export function StageView({ slug }: Props) {
  const { data, isLoading } = usePollResults(slug);

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center px-12">
        <div className="grid w-full max-w-[1600px] grid-cols-2 gap-12">
          <div className="space-y-6">
            <div className="h-10 w-3/4 rounded-md bg-muted animate-pulse" />
            <div className="h-6 w-1/2 rounded-md bg-muted animate-pulse" />
          </div>
          <div className="flex items-center justify-center">
            <div className="h-48 w-3/4 rounded-md bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  const sorted = [...data.options].sort((a, b) => b.count - a.count);
  const leader = sorted[0];
  const runnerUp = sorted[1];

  if (data.total === 0 || !leader) {
    return (
      <motion.div
        variants={screenSwap}
        initial="enter"
        animate="center"
        className="flex min-h-screen items-center justify-center px-12 text-center"
      >
        <div className="space-y-6">
          <p className="text-3xl uppercase tracking-widest text-muted-foreground">
            {data.question}
          </p>
          <p className="text-4xl font-semibold text-muted-foreground">
            Aguardando primeiro voto…
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={screenSwap}
      initial="enter"
      animate="center"
      className="flex min-h-screen items-center justify-center px-12"
    >
      <div className="grid w-full max-w-[1600px] grid-cols-2 items-center gap-12">
        {/* Left: question + total */}
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">
            AO VIVO
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            {data.question}
          </h1>
          <p className="text-2xl tabular-nums text-muted-foreground">
            {data.total} {data.total === 1 ? "voto" : "votos"}
          </p>
        </div>

        {/* Right: leader + runner-up */}
        <div className="flex flex-col items-end gap-6 text-right">
          <p
            className="font-black tracking-tighter leading-none text-[clamp(96px,28vw,240px)] text-primary"
            style={{ color: "var(--primary)" }}
          >
            {leader.percentage.toFixed(0)}%
          </p>
          <p className="text-3xl font-semibold sm:text-4xl">{leader.label}</p>
          {runnerUp ? (
            <p className="text-xl text-muted-foreground">
              vs {runnerUp.label}{" "}
              <span className="tabular-nums">
                {runnerUp.percentage.toFixed(0)}%
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}
