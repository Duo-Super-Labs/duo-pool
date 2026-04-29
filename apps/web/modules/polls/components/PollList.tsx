"use client";

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/ui/card";
import { usePolls } from "../api";

export function PollList() {
  const { data, isLoading, error } = usePolls();

  if (isLoading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-36 rounded-xl border bg-muted/30 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-500">
        Falha ao carregar polls: {error.message}
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nenhuma poll cadastrada.</p>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      {data.map((poll) => (
        <Link
          key={poll.id}
          href={`/poll/${poll.slug}`}
          className="block h-full"
        >
          <Card className="h-full transition-colors hover:border-primary/40">
            <CardHeader className="space-y-3 p-7">
              <CardTitle className="text-lg leading-snug">
                {poll.question}
              </CardTitle>
              <CardDescription>/{poll.slug}</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}
