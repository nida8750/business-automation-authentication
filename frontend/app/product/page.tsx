import { MuteLoopVideo, ReportStill } from "@/components/marketing/ReportMedia";
import { SiteFooter, SiteHeader } from "@/components/marketing/SiteChrome";
import { Badge, Button, Card } from "@/components/ui";
import { progressReports } from "@/lib/sample";

const pillars = [
  {
    title: "Agent marketplace",
    body: "Deploy Sales, Support, Marketing, Finance, Operations, People, and Data Analyst. Each agent has a tool belt, budget cap, and kill switch.",
  },
  {
    title: "Visual workflow canvas",
    body: "Trigger, condition, agent, action, approval, and end nodes. Test runs, versions, and error logs sit beside the graph — not in a separate admin relic.",
  },
  {
    title: "Integrations that already exist",
    body: "Gmail, WhatsApp, Slack, CRM, Stripe, Shopify, Notion, Drive, calendars. Nexaflow does not ask you to rip out the stack.",
  },
  {
    title: "Inbox of last-mile judgment",
    body: "Approvals, exceptions, and policy matches. Reviewers see the draft, the reason, and the cost before anything leaves the building.",
  },
  {
    title: "Analytics and ROI",
    body: "Tasks, success rate, hours returned, and dollars saved — by workflow, agent, and tool.",
  },
  {
    title: "Chief of Staff",
    body: "A conversational layer that recommends automations, explains a spike, and compiles a runbook from a sentence.",
  },
];

export default function ProductPage() {
  return (
    <div className="bg-app grid-bg min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-16">
        <Badge tone="blue">Product</Badge>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">The operating system for a multi-agent company.</h1>
        <p className="mt-4 max-w-2xl text-lg text-[rgb(var(--muted))]">
          Nexaflow is not a chatbot bolted onto email. It is a desk: agents collaborate, humans approve, and every write is observable.
        </p>
        <div className="mt-8 flex gap-3">
          <Button href="/app">Open the OS</Button>
          <Button href="/register" variant="ghost">
            Start automating
          </Button>
        </div>
        <div className="mt-10 overflow-hidden rounded-3xl border border-line">
          <MuteLoopVideo
            src="/media/progress-data.mp4"
            poster="/media/report-weekly.png"
            label="Data motion behind the product progress story"
            className="aspect-video h-auto w-full object-cover"
          />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {progressReports.slice(0, 2).map((report) => (
            <ReportStill key={report.src} {...report} />
          ))}
        </div>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {pillars.map((p) => (
            <Card key={p.title}>
              <h2 className="text-lg font-medium">{p.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--muted))]">{p.body}</p>
            </Card>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
