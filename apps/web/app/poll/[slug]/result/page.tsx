import { db } from "@duopool/database";
import { getPollBySlug, getUserVote } from "@duopool/database/query/polls";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ResultStage } from "@/modules/polls/components/ResultStage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Fullscreen result screen. Server component:
 *  - resolves slug → poll (404 if missing)
 *  - reads `dp_voter` cookie via `next/headers`
 *  - looks up the voter's chosen optionId (if any) so the client component
 *    can render "✓ Você votou X" without an extra round-trip
 */
export default async function PollResultPage({ params }: PageProps) {
  const { slug } = await params;
  const poll = await getPollBySlug(db, slug);
  if (!poll) {
    notFound();
  }

  const cookieStore = await cookies();
  const voterId = cookieStore.get("dp_voter")?.value;

  let youVotedOptionId: string | undefined;
  if (voterId) {
    const optionId = await getUserVote(db, { voterId, pollId: poll.id });
    youVotedOptionId = optionId ?? undefined;
  }

  return (
    <main className="min-h-screen">
      <ResultStage slug={slug} youVotedOptionId={youVotedOptionId} />
    </main>
  );
}
