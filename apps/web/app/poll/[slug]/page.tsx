import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPollBySlug, hasVoted } from "@/lib/server/polls";
import { VoteScreen } from "@/modules/polls/components/VoteScreen";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Vote screen route. RSC reads the `dp_voter` cookie and redirects voters
// who have already voted to /poll/<slug>/result, eliminating the flash of
// vote UI on return visits. The client-side <useHasVoted> hook in
// `modules/polls/api.ts` covers hot-reload edge cases.
export default async function PollDetailPage({ params }: PageProps) {
  const { slug } = await params; // Next 16 — params is async.

  const poll = await getPollBySlug(slug);
  if (!poll) {
    notFound();
  }

  const cookieStore = await cookies();
  const voterId = cookieStore.get("dp_voter")?.value ?? null;
  if (voterId && (await hasVoted({ voterId, pollId: poll.id }))) {
    redirect(`/poll/${slug}/result`);
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12 space-y-10">
      <Link
        href="/"
        className="-ml-3 inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent/10 hover:text-foreground"
      >
        ← Voltar
      </Link>
      <VoteScreen
        poll={{
          id: poll.id,
          slug: poll.slug,
          question: poll.question,
          options: poll.options.map((option) => ({
            id: option.id,
            label: option.label,
          })),
        }}
      />
    </main>
  );
}
