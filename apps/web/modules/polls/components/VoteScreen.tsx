"use client";

import { motion } from "@duopool/motion";
import { fadeUp } from "@duopool/motion/variants";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useVote, VOTE_NOT_IMPLEMENTED_MESSAGE } from "../api";
import { useVoterCookie } from "../hooks/use-voter-cookie";
import { HoldButton } from "./HoldButton";

interface VoteScreenPoll {
  id: string;
  slug: string;
  question: string;
  options: { id: string; label: string }[];
}

interface VoteScreenProps {
  poll: VoteScreenPoll;
}

interface MessageState {
  kind: "demo-pending" | "error";
  text: string;
}

export function VoteScreen({ poll }: VoteScreenProps) {
  const router = useRouter();
  const voterId = useVoterCookie();
  const vote = useVote();
  const [message, setMessage] = useState<MessageState | null>(null);

  const cookieReady = voterId !== null;
  const disabled = !cookieReady || vote.isPending;

  async function handleCommit(optionId: string) {
    setMessage(null);
    try {
      await vote.mutateAsync({ pollId: poll.id, pollOptionId: optionId });
      router.push(`/poll/${poll.slug}/result`);
    } catch (error) {
      const text =
        error instanceof Error ? error.message : "Erro ao registrar voto.";
      if (text === VOTE_NOT_IMPLEMENTED_MESSAGE) {
        setMessage({
          kind: "demo-pending",
          text: "Votação ao vivo: este botão será ligado durante a talk.",
        });
        return;
      }
      setMessage({ kind: "error", text });
    }
  }

  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="mx-auto flex w-full max-w-xl flex-col gap-8"
    >
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Hold to vote
        </p>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {poll.question}
        </h1>
      </header>

      <ul className="flex flex-col gap-4">
        {poll.options.map((option, index) => (
          <li key={option.id}>
            <HoldButton
              label={option.label}
              accent={index % 2 === 0 ? "primary" : "secondary"}
              disabled={disabled}
              onCommit={() => handleCommit(option.id)}
            />
          </li>
        ))}
      </ul>

      {!cookieReady ? (
        <p className="text-xs text-muted-foreground">Preparando dispositivo…</p>
      ) : null}

      {message ? (
        <p
          role="status"
          aria-live="polite"
          data-message-kind={message.kind}
          className={
            message.kind === "demo-pending"
              ? "text-sm text-muted-foreground"
              : "text-sm text-destructive"
          }
        >
          {message.text}
        </p>
      ) : null}
    </motion.div>
  );
}
