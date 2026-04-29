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
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl border bg-muted/30 animate-pulse"
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
    <div className="grid gap-4 sm:grid-cols-2">
      {data.map((poll) => {
        console.log({ poll });
        return (
          <Link key={poll.id} href={`/poll/${poll.slug}`} className="block">
            <Card className="hover:border-primary/40 transition-colors h-full">
              <CardHeader>
                <CardTitle>{poll.question}</CardTitle>
                <CardDescription>/{poll.slug}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
