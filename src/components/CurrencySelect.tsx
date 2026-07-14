"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, Search } from "lucide-react"
import { CURRENCIES } from "@/lib/currencies"
import { METALS } from "@/lib/metals"
import { cn } from "@/lib/utils"

interface CurrencySelectProps {
  value: string
  onChange: (code: string) => void
  label: string
  includeMetals?: boolean
}

export function CurrencySelect({ value, onChange, label, includeMetals = false }: CurrencySelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const ref = useRef<HTMLDivElement>(null)

  const selectedCurrency = CURRENCIES.find((c) => c.code === value)
  const selectedMetal = METALS.find((m) => m.code === value)

  const filteredCurrencies = CURRENCIES.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  )

  const filteredMetals = includeMetals
    ? METALS.filter(
        (m) =>
          m.code.toLowerCase().includes(search.toLowerCase()) ||
          m.name.toLowerCase().includes(search.toLowerCase())
      )
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch("")
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div className="flex flex-col gap-1" ref={ref}>
      <label className="text-xs text-slate-400 uppercase tracking-widest font-mono">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-all",
          "bg-white/5 border border-white/10 hover:border-[#6366f1]/50",
          "focus:outline-none focus:border-[#6366f1]",
          open && "border-[#6366f1]/50"
        )}
      >
        {selectedMetal ? (
          <span className="text-xl">{selectedMetal.icon}</span>
        ) : (
          <span className="text-xl">{selectedCurrency?.flag}</span>
        )}
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-lg font-bold text-white font-mono leading-tight">
            {value}
          </span>
          <span className="text-xs text-slate-400 truncate">
            {selectedMetal?.name ?? selectedCurrency?.name ?? value}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-slate-400 transition-transform flex-shrink-0",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          className="absolute mt-1 z-50 w-64 rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: "rgba(15, 15, 25, 0.97)", backdropFilter: "blur(20px)" }}
        >
          <div className="p-2 border-b border-white/10">
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {/* Currencies group */}
            {includeMetals && filteredCurrencies.length > 0 && (
              <li className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-600">
                Currencies
              </li>
            )}
            {filteredCurrencies.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(c.code)
                    setOpen(false)
                    setSearch("")
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-white/5",
                    c.code === value && "bg-[#6366f1]/10 text-[#6366f1]"
                  )}
                >
                  <span className="text-base">{c.flag}</span>
                  <span className="font-mono font-semibold text-white w-10">{c.code}</span>
                  <span className="text-slate-400 truncate">{c.name}</span>
                </button>
              </li>
            ))}

            {/* Commodities group */}
            {filteredMetals.length > 0 && (
              <>
                <li className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-600 border-t border-white/5 mt-1 pt-2">
                  Commodities
                </li>
                {filteredMetals.map((m) => (
                  <li key={m.code}>
                    <button
                      type="button"
                      onClick={() => {
                        onChange(m.code)
                        setOpen(false)
                        setSearch("")
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors hover:bg-white/5",
                        m.code === value && "bg-[#6366f1]/10 text-[#6366f1]"
                      )}
                    >
                      <span className="text-base">{m.icon}</span>
                      <span className="font-mono font-semibold text-white w-10">{m.code}</span>
                      <span className="text-slate-400 truncate">{m.name}</span>
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
