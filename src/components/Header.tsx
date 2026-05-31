"use client"

import { TrendingUp } from "lucide-react"

export function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#6366f1]/20 border border-[#6366f1]/30">
          <TrendingUp className="w-4 h-4 text-[#6366f1]" />
        </div>
        <span
          className="text-xl font-bold tracking-tight text-white"
          style={{ fontFamily: "var(--font-space-grotesk)" }}
        >
          Currency<span className="text-[#6366f1]">Versus</span>
        </span>
      </div>
      <div className="text-xs text-slate-500 font-mono">
        Powered by ECB data
      </div>
    </header>
  )
}
