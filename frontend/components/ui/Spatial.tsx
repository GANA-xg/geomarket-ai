import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type HoloPanelProps = HTMLAttributes<HTMLDivElement> & {
  glow?: "cyan" | "orange" | "emerald" | "rose";
};

const glowClass = {
  cyan: "shadow-[0_24px_90px_rgba(56,189,248,0.10)] before:bg-cyan-300/35",
  orange: "shadow-[0_24px_90px_rgba(249,115,22,0.10)] before:bg-orange-300/35",
  emerald: "shadow-[0_24px_90px_rgba(16,185,129,0.10)] before:bg-emerald-300/35",
  rose: "shadow-[0_24px_90px_rgba(244,63,94,0.10)] before:bg-rose-300/35",
};

export function HoloPanel({ className, children, glow = "cyan", ...props }: HoloPanelProps) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/[0.10] bg-[#071017]/78 backdrop-blur-xl",
        "before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:opacity-70",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-[linear-gradient(135deg,rgba(255,255,255,0.10),transparent_24%,transparent_70%,rgba(255,255,255,0.05))]",
        "transition-transform duration-300 hover:-translate-y-1 hover:border-white/[0.16]",
        glowClass[glow],
        className
      )}
      {...props}
    >
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}

export function PageConstellation({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <HoloPanel className="p-5 sm:p-6" glow="orange">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-200/80">{eyebrow}</div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{body}</p>
        </div>
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </HoloPanel>
  );
}

export function LiveOrb({ label, value, tone = "cyan" }: { label: string; value: string; tone?: "cyan" | "emerald" | "orange" | "rose" }) {
  const toneClass = {
    cyan: "from-cyan-300/25 text-cyan-100 shadow-cyan-500/15",
    emerald: "from-emerald-300/25 text-emerald-100 shadow-emerald-500/15",
    orange: "from-orange-300/25 text-orange-100 shadow-orange-500/15",
    rose: "from-rose-300/25 text-rose-100 shadow-rose-500/15",
  };

  return (
    <div className="relative flex h-28 w-28 items-center justify-center rounded-full border border-white/10 bg-black/30">
      <div className={cn("absolute inset-2 rounded-full bg-gradient-to-br to-transparent blur-sm", toneClass[tone])} />
      <div className="relative text-center">
        <div className="text-2xl font-semibold">{value}</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-slate-500">{label}</div>
      </div>
    </div>
  );
}
