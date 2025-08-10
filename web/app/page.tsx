import type React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import {
  MessageSquare,
  Github,
  ArrowRight,
  Sparkles,
  Mail,
  FileText,
  FileSpreadsheet,
  HardDrive,
  SlackIcon,
  CalendarIcon,
  SquareStack,
  KanbanSquare,
} from "lucide-react"
import type { Metadata } from "next"
import { Instrument_Serif } from "next/font/google"
import { MinimalCard, MinimalCardDescription, MinimalCardTitle } from "@/components/ui/minimal-card"
import Footer from "@/components/footer"

const instrumentSerif = Instrument_Serif({
  weight: ["400"],
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "kuch bhi — Karo Kuch Bhi. Kahin Bhi.",
  description: "An ultra‑minimal MCP server for WhatsApp. Powered by Puch AI.",
}

function Background() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[65vh] sm:h-[70vh]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(100% 70% at 50% 0%, rgba(125, 211, 252, 0.34), transparent 82%)",
          backgroundSize: "100% 100%",
        }}
      />
    </div>
  )
}

function Navbar() {
  return (
    <header className="sticky top-4 z-50">
      <div className="mx-auto max-w-5xl px-4">
        <nav
          aria-label="Primary"
          className="mx-auto flex items-center justify-between rounded-2xl border border-slate-200/70 bg-white/80 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/60"
        >
          <Link
            href="#"
            className="group inline-flex items-center gap-2 rounded-xl px-2 py-1.5 text-slate-900"
            aria-label="kuch bhi home"
          >
            <div className="grid h-8 w-8 place-items-center rounded-xl border border-slate-200 bg-white text-slate-900 transition-colors group-hover:border-slate-300">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className={`font-semibold tracking-tight ${instrumentSerif.className}`}>kuch bhi</div>
          </Link>
          <div className="flex items-center gap-1.5">
            <Link href="#supported" className="rounded-xl">
              <Button variant="ghost" size="sm" className="rounded-xl text-slate-800 hover:bg-slate-100">
                Supported
              </Button>
            </Link>
            <Link
              href="https://puch.ai/mcp/y5KzK0ipnu"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl"
            >
              <Button
                size="sm"
                className="rounded-xl bg-slate-900 text-white hover:bg-slate-900/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
              >
                Try kuch bhi
              </Button>
            </Link>
            <Link href="https://github.com/gungunjain36/kuch-bhi" target="_blank" rel="noopener noreferrer" className="rounded-xl">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
              >
                <Github className="mr-2 h-4 w-4" aria-hidden="true" />
                GitHub
              </Button>
            </Link>
          </div>
        </nav>
      </div>
    </header>
  )
}

function CardVisual({
  variant,
  Icon,
}: {
  variant: "gmail" | "docs" | "sheets" | "drive"
  Icon: React.ElementType
}) {
  const gradient =
    variant === "gmail"
      ? "bg-[radial-gradient(220px_160px_at_30%_20%,rgba(255,90,90,0.55),transparent),radial-gradient(260px_180px_at_70%_80%,rgba(255,180,60,0.55),transparent)]"
      : variant === "docs"
        ? "bg-[radial-gradient(220px_160px_at_30%_20%,rgba(60,140,255,0.55),transparent),radial-gradient(260px_180px_at_70%_80%,rgba(100,180,255,0.45),transparent)]"
        : variant === "sheets"
          ? "bg-[radial-gradient(220px_160px_at_30%_20%,rgba(40,180,120,0.55),transparent),radial-gradient(260px_180px_at_70%_80%,rgba(90,220,160,0.45),transparent)]"
          : "bg-[radial-gradient(220px_160px_at_30%_20%,rgba(255,210,80,0.55),transparent),radial-gradient(260px_180px_at_70%_80%,rgba(80,140,255,0.45),transparent)]"

  return (
    <div
      className={`relative mb-6 h-[280px] sm:h-[320px] w-full rounded-[20px] ${gradient} shadow-[0px_1px_1px_0px_rgba(0,0,0,0.05),0px_1px_1px_0px_rgba(255,252,240,0.5)_inset,0px_0px_0px_1px_hsla(0,0%,100%,0.1)_inset,0px_0px_1px_0px_rgba(28,27,26,0.5)]`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-[16px] bg-[radial-gradient(600px_220px_at_50%_12%,transparent,rgba(255,255,255,0.22))]" />
      <div className="grid h-full place-items-center">
        <div className="rounded-2xl bg-white/60 p-5 backdrop-blur ring-1 ring-white/60">
          <Icon className="h-10 w-10 text-slate-900" />
        </div>
      </div>
    </div>
  )
}

type RoadmapItem = {
  label: string
  checked: boolean
  status: "Available" | "Upcoming"
  Icon: React.ElementType
  accent: string
}

const roadmap: RoadmapItem[] = [
  { label: "Gmail", checked: true, status: "Available", Icon: Mail, accent: "from-emerald-300/50 to-emerald-200/30" },
  { label: "Docs", checked: true, status: "Available", Icon: FileText, accent: "from-sky-300/50 to-sky-200/30" },
  {
    label: "Sheets",
    checked: true,
    status: "Available",
    Icon: FileSpreadsheet,
    accent: "from-teal-300/50 to-teal-200/30",
  },
  { label: "Drive", checked: true, status: "Available", Icon: HardDrive, accent: "from-amber-300/50 to-amber-200/30" },
  { label: "Slack", checked: false, status: "Upcoming", Icon: SlackIcon, accent: "from-fuchsia-300/40 to-pink-200/25" },
  { label: "GitHub", checked: false, status: "Upcoming", Icon: Github, accent: "from-slate-300/40 to-slate-200/25" },
  { label: "v0", checked: false, status: "Upcoming", Icon: Sparkles, accent: "from-indigo-300/40 to-violet-200/25" },
  { label: "Notion", checked: false, status: "Upcoming", Icon: SquareStack, accent: "from-zinc-300/40 to-zinc-200/25" },
  {
    label: "Linear",
    checked: false,
    status: "Upcoming",
    Icon: KanbanSquare,
    accent: "from-blue-300/40 to-blue-200/25",
  },
  {
    label: "Calendar",
    checked: false,
    status: "Upcoming",
    Icon: CalendarIcon,
    accent: "from-cyan-300/40 to-cyan-200/25",
  },
]

function RoadmapCard({ item }: { item: RoadmapItem }) {
  const { Icon } = item
  return (
    <div className="relative flex flex-col rounded-2xl border border-slate-200/70 bg-white/70 p-4 shadow-sm backdrop-blur transition-colors hover:border-slate-300">
      <div className={`inline-flex items-center gap-3`}>
        <div className={`rounded-xl bg-gradient-to-br ${item.accent} p-2.5 ring-1 ring-white/50`}>
          <Icon className="h-4 w-4 text-slate-900" aria-hidden="true" />
        </div>
        <h3 className={`text-sm font-semibold text-slate-900 ${instrumentSerif.className}`}>{item.label}</h3>
        <span
          className={`ml-auto inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
            item.checked
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white text-slate-700"
          }`}
        >
          {item.status}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox id={`rm-${item.label}`} checked={item.checked} disabled aria-readonly />
          <label htmlFor={`rm-${item.label}`} className="text-xs text-slate-700">
            {item.checked ? "Enabled" : "Planned"}
          </label>
        </div>
        <Button variant="ghost" size="sm" className="h-7 rounded-lg px-2 text-slate-800 hover:bg-slate-100">
          Learn more
          <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <div className="relative min-h-[100dvh] bg-white text-slate-900 antialiased">
      <Background />
      <Navbar />

      {/* Hero: centered, slightly higher on the page */}
      <main className="relative mx-auto flex min-h-[80dvh] max-w-5xl flex-col items-center justify-center px-4 pt-16 sm:pt-20">
        <div className="mb-6 flex items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full border-slate-300/70 bg-white/70 px-3 py-1 text-xs font-medium text-slate-800 backdrop-blur"
          >
            Powered by Puch AI
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full border-slate-300/70 bg-white/70 px-3 py-1 text-xs text-slate-800 backdrop-blur"
          >
            WhatsApp native
          </Badge>
        </div>

        <h1
          className={`mx-auto max-w-3xl bg-gradient-to-r from-amber-400 via-sky-400 to-blue-500 bg-clip-text text-center text-transparent text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl ${instrumentSerif.className}`}
        >
          Karo Kuch Bhi. Kahin Bhi.
        </h1>

        <p className="mt-4 max-w-2xl text-center text-sm leading-6 text-slate-800 sm:text-base">
          An ultra‑minimal MCP server that lets you do almost anything on WhatsApp — clean, fast, and launch‑ready.
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="https://puch.ai/mcp/y5KzK0ipnu" target="_blank" rel="noopener noreferrer" className="rounded-2xl">
            <Button
              size="lg"
              className="rounded-2xl bg-slate-900 px-5 text-white transition-colors hover:bg-slate-900/90 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400"
            >
              <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
              Try kuch bhi
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>

          <Link href="https://github.com/gungunjain36/kuch-bhi" target="_blank" rel="noopener noreferrer" className="rounded-2xl">
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
            >
              <Github className="mr-2 h-4 w-4" aria-hidden="true" />
              View on GitHub
            </Button>
          </Link>
        </div>
      </main>

      {/* Supported Today: starts after full screen hero */}
      <section id="supported" className="relative mx-auto w-full max-w-6xl px-4 pb-24">
        <header className="mx-auto max-w-3xl text-center">
          <h2 className={`text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl ${instrumentSerif.className}`}>
            Supported today
          </h2>
          <p className="mt-2 text-sm text-slate-700">Google Workspace first. More every week.</p>
        </header>

        <div className="mx-auto mt-6 max-w-5xl">
          <div className="flex flex-wrap items-stretch justify-center gap-6">
            <MinimalCard className="w-[260px] sm:w-[280px] md:w-[320px]">
              <CardVisual variant="gmail" Icon={Mail} />
              <MinimalCardTitle>Gmail</MinimalCardTitle>
              <MinimalCardDescription>Draft, send, search. Inbox control from chat.</MinimalCardDescription>
            </MinimalCard>

            <MinimalCard className="w-[260px] sm:w-[280px] md:w-[320px]">
              <CardVisual variant="docs" Icon={FileText} />
              <MinimalCardTitle>Docs</MinimalCardTitle>
              <MinimalCardDescription>Create, edit, summarize. Clean docs, faster.</MinimalCardDescription>
            </MinimalCard>

            <MinimalCard className="w-[260px] sm:w-[280px] md:w-[320px]">
              <CardVisual variant="sheets" Icon={FileSpreadsheet} />
              <MinimalCardTitle>Sheets</MinimalCardTitle>
              <MinimalCardDescription>Update, analyze, and automate — right in chat.</MinimalCardDescription>
            </MinimalCard>

            <MinimalCard className="w-[260px] sm:w-[280px] md:w-[320px]">
              <CardVisual variant="drive" Icon={HardDrive} />
              <MinimalCardTitle>Drive</MinimalCardTitle>
              <MinimalCardDescription>Search, fetch, and share your files instantly.</MinimalCardDescription>
            </MinimalCard>
          </div>
        </div>

        {/* Roadmap: card-inspired, minimal grid */}
        <div className="mx-auto mt-14 max-w-5xl">
          <header className="mx-auto mb-4 max-w-3xl text-center">
            <h3 className={`text-xl font-medium text-slate-900 ${instrumentSerif.className}`}>Roadmap</h3>
            <p className="mt-1 text-sm text-slate-700">Everything with an API — shipping weekly.</p>
          </header>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {roadmap.map((item) => (
              <RoadmapCard key={item.label} item={item} />
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
