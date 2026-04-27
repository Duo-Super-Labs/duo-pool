import Link from "next/link";
import { PollPage } from "@/modules/polls/components/PollPage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function PollDetailPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main className="container mx-auto max-w-2xl px-4 py-12 space-y-6">
      <Link
        href="/"
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Voltar
      </Link>
      <PollPage slug={slug} />
    </main>
  );
}
