import { PollList } from "@/modules/polls/components/PollList";

export default function HomePage() {
  return (
    <main className="container mx-auto max-w-4xl px-4 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">DuoPool</h1>
        <p className="text-muted-foreground">
          Live polls · Engenharia de Contexto · Univali
        </p>
      </header>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Polls disponíveis</h2>
        <PollList />
      </section>
    </main>
  );
}
