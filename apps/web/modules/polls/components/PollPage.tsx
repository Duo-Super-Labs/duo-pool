"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePoll } from "../api";
import { useVoterCookie } from "../hooks/use-voter-cookie";
import { ResultsBar } from "./ResultsBar";

interface Props {
  slug: string;
}

export function PollPage({ slug }: Props) {
  const { data: poll, isLoading } = usePoll(slug);
  const voterId = useVoterCookie();
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-3/4 rounded bg-muted animate-pulse" />
        <div className="h-64 rounded-xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (!poll) {
    return (
      <p className="text-sm text-muted-foreground">Poll não encontrada.</p>
    );
  }

  // ⚠️ Vote handler is RESERVED for the live demo. Until /duo.exec runs,
  // the button below stays disabled. The handler logic will live in
  // modules/polls/api.ts (useVote) and be wired here. See CLAUDE.md.
  const onVote = () => {
    console.warn("polls.vote is not implemented yet — reserved for live demo");
  };

  const voteEnabled = false; // flips to true once useVote() is implemented

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{poll.question}</CardTitle>
          <CardDescription>
            {poll.options.length} opções · 1 voto por device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2">
            {poll.options.map((opt) => (
              <li key={opt.id}>
                <button
                  type="button"
                  onClick={() => setSelected(opt.id)}
                  className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                    selected === opt.id
                      ? "border-primary bg-primary/5"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            ))}
          </ul>
          <Button
            onClick={onVote}
            disabled={!voteEnabled || !selected || !voterId}
            className="w-full"
          >
            {voteEnabled ? "Votar" : "Votação será habilitada ao vivo"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resultado em tempo real</CardTitle>
        </CardHeader>
        <CardContent>
          <ResultsBar slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}
