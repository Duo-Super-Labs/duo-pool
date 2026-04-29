import { db } from "@duopool/database";
import { getPollBySlug } from "@duopool/database/query/polls";
import { notFound } from "next/navigation";
import { StageView } from "@/modules/polls/components/StageView";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Projector mode. Renders a horizontal 16:9 view of a poll's live results,
 * intended for a big screen behind the speaker. No vote UI, no chrome.
 */
export default async function StagePage({ params }: PageProps) {
  const { slug } = await params;
  const poll = await getPollBySlug(db, slug);
  if (!poll) {
    notFound();
  }

  return <StageView slug={slug} />;
}
