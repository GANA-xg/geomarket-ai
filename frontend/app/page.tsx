import Link from "next/link";
import { ArrowRight, BarChart3, BellRing, BrainCircuit, Globe2, LineChart, Radar } from "lucide-react";
import { MarketGlobeScene } from "@/components/landing/MarketGlobeScene";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030609] text-slate-100">
      <section className="relative flex min-h-screen flex-col">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(56,189,248,0.18)_0%,rgba(3,6,9,0)_20%,rgba(3,6,9,0.96)_88%)]" />
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.42),transparent_44%)]" />
        <div className="absolute inset-0">
          <MarketGlobeScene />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_62%,rgba(249,115,22,0.20),transparent_32%),linear-gradient(90deg,rgba(3,6,9,0.92),rgba(3,6,9,0.36)_48%,rgba(3,6,9,0.92))]" />

        <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_30px_rgba(56,189,248,0.16)]">
              <Globe2 size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold tracking-wide">GeoMarket AI</span>
              <span className="block text-[10px] uppercase tracking-[0.28em] text-slate-500">Signal Earth</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-slate-400 md:flex">
            <Link href="/dashboard" className="transition-colors hover:text-slate-100">Dashboard</Link>
            <Link href="/stocks" className="transition-colors hover:text-slate-100">Stocks</Link>
            <Link href="/news" className="transition-colors hover:text-slate-100">News</Link>
            <Link href="/map" className="transition-colors hover:text-slate-100">Geo Map</Link>
          </nav>

          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-orange-300/25 bg-orange-400/15 px-4 text-sm font-medium text-orange-100 shadow-[0_0_30px_rgba(249,115,22,0.14)] transition-colors hover:bg-orange-400/25"
          >
            Launch
            <ArrowRight size={15} />
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 pb-28 pt-14 sm:px-8 lg:pt-4">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300 backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
              Live geopolitical market intelligence
            </div>
            <h1 className="text-balance text-5xl font-semibold leading-[1.02] text-white sm:text-6xl lg:text-7xl">
              See global events become market signals in 3D.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-slate-400 sm:text-lg">
              GeoMarket AI turns news, macro pressure, valuation filters, and quant factors into a living command layer for stocks, portfolios, and country exposure.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 text-sm font-semibold text-slate-950 shadow-[0_0_40px_rgba(56,189,248,0.28)] transition-transform hover:scale-[1.02]"
              >
                Open command center
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/map"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 text-sm font-semibold text-slate-100 backdrop-blur transition-colors hover:bg-white/[0.08]"
              >
                Explore geo map
              </Link>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto mb-8 grid w-[calc(100%-2.5rem)] max-w-5xl grid-cols-2 gap-2 rounded-2xl border border-white/10 bg-[#05080c]/82 p-2 shadow-[0_-22px_80px_rgba(3,6,9,0.55)] backdrop-blur-xl sm:grid-cols-4 lg:grid-cols-6">
          {[
            { label: "Signals", icon: Radar },
            { label: "Analytics", icon: BarChart3 },
            { label: "AI Briefs", icon: BrainCircuit },
            { label: "Stocks", icon: LineChart },
            { label: "Alerts", icon: BellRing },
            { label: "Geo Map", icon: Globe2 },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.label === "Geo Map" ? "/map" : item.label === "Stocks" ? "/stocks" : "/dashboard"}
                className="flex h-12 items-center justify-center gap-2 rounded-xl text-xs font-medium text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-100"
              >
                <Icon size={15} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
