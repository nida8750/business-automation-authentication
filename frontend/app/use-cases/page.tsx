import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { Badge, Button, Card } from "@/components/ui";
import { useCases } from "@/lib/sample";

export default function UseCasesPage() {
  return (
    <div className="bg-app grid-bg min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <Badge tone="violet">Use cases</Badge>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">The same OS. Different desks.</h1>
        <p className="mt-4 max-w-2xl text-lg text-[rgb(var(--muted))]">
          Founders, ops teams, agencies, and shops share the graph. They do not share the same first workflow.
        </p>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {useCases.map((item) => (
            <Card key={item.id} className="min-h-[200px]">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-sky-300">{item.id}</p>
              <h2 className="mt-3 text-2xl font-semibold">{item.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-[rgb(var(--muted))]">{item.body}</p>
            </Card>
          ))}
        </div>
        <div className="mt-12">
          <Button href="/register">Start with a template</Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
