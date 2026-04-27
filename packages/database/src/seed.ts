import { db } from "./client.ts";
import { pollOptions, polls } from "./schema/polls.ts";

const seedPolls = [
  {
    slug: "melhor-anime-2025",
    question: "Melhor anime de 2025?",
    options: [
      "Frieren — Beyond Journey's End",
      "Solo Leveling",
      "Dandadan",
      "Apothecary Diaries",
    ],
  },
  {
    slug: "melhor-dev-fictio",
    question: "Qual personagem fictício seria o melhor dev?",
    options: ["Tony Stark", "Hermione Granger", "Light Yagami", "Walter White"],
  },
  {
    slug: "vibecoding-vs-eng-contexto",
    question: "Vibecoding ou Engenharia de Contexto?",
    options: [
      "Vibecoding — só pedir e ver o que sai",
      "Engenharia de Contexto — processo + arquitetura + tipos",
    ],
  },
];

console.log("Seeding polls…");

for (const seed of seedPolls) {
  // Idempotent: skip if slug already exists.
  const existing = await db.query.polls.findFirst({
    where: (p, { eq }) => eq(p.slug, seed.slug),
  });

  if (existing) {
    console.log(`  · skip ${seed.slug} (already exists)`);
    continue;
  }

  const [poll] = await db
    .insert(polls)
    .values({ slug: seed.slug, question: seed.question })
    .returning();

  if (!poll) {
    throw new Error(`Failed to insert poll ${seed.slug}`);
  }

  await db.insert(pollOptions).values(
    seed.options.map((label, index) => ({
      pollId: poll.id,
      label,
      order: index,
    })),
  );

  console.log(`  ✓ inserted ${seed.slug} (${seed.options.length} options)`);
}

console.log("✓ Seed complete");
process.exit(0);
