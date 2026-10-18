"use client"

import { useId, useState } from "react"
import { Combobox } from "@base-ui/react/combobox"
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

interface Option {
  code: string
  name: string
  icon: string
}

interface OptionGroup {
  value: string // group label
  items: Option[]
}

const CURRENCY_OPTIONS: Option[] = CURRENCIES.map((c) => ({ code: c.code, name: c.name, icon: c.flag }))
const METAL_OPTIONS: Option[] = METALS.map((m) => ({ code: m.code, name: m.name, icon: m.icon }))

function matches(option: Option, query: string): boolean {
  const q = query.trim().toLowerCase()
  return q === "" || option.code.toLowerCase().includes(q) || option.name.toLowerCase().includes(q)
}

// Searchable currency/metal picker built on Base UI's Combobox, which supplies
// the ARIA combobox/listbox semantics (aria-expanded, aria-controls,
// role="option", aria-selected), label association and keyboard handling
// (arrows to move, Enter to select, Escape to close).
export function CurrencySelect({ value, onChange, label, includeMetals = false }: CurrencySelectProps) {
  const [query, setQuery] = useState("")
  const searchId = `${useId()}-search`
  const searchLabel = includeMetals ? "Search currencies and metals" : "Search currencies"

  const groups: OptionGroup[] = includeMetals
    ? [
        { value: "Currencies", items: CURRENCY_OPTIONS },
        { value: "Commodities", items: METAL_OPTIONS },
      ]
    : [{ value: "Currencies", items: CURRENCY_OPTIONS }]

  const selected =
    CURRENCY_OPTIONS.find((o) => o.code === value) ?? METAL_OPTIONS.find((o) => o.code === value) ?? null

  return (
    <Combobox.Root<Option>
      items={groups}
      value={selected}
      onValueChange={(next) => {
        if (next) onChange(next.code)
      }}
      isItemEqualToValue={(a, b) => a.code === b.code}
      itemToStringLabel={(o) => o.code}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={(open) => {
        if (!open) setQuery("")
      }}
      filter={(o, q) => matches(o, q)}
    >
      <div className="flex flex-col gap-1">
        <Combobox.Label className="text-xs text-slate-400 uppercase tracking-widest font-mono">
          {label}
        </Combobox.Label>
        <Combobox.Trigger
          className={cn(
            "w-full flex items-center gap-2 px-4 py-3 rounded-xl text-left transition-all",
            "bg-white/5 border border-white/10 hover:border-[#6366f1]/50",
            "focus:outline-none focus:border-[#6366f1] data-[popup-open]:border-[#6366f1]/50"
          )}
        >
          <span className="text-xl" aria-hidden="true">{selected?.icon}</span>
          <span className="flex flex-col flex-1 min-w-0">
            <span className="text-lg font-bold text-white font-mono leading-tight">{value}</span>
            <span className="text-xs text-slate-400 truncate">{selected?.name ?? value}</span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className="w-4 h-4 text-slate-400 transition-transform flex-shrink-0 [[data-popup-open]_&]:rotate-180"
          />
        </Combobox.Trigger>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" className="z-50">
          <Combobox.Popup
            className="w-64 rounded-xl border border-white/10 shadow-2xl overflow-hidden"
            style={{ background: "rgba(15, 15, 25, 0.97)", backdropFilter: "blur(20px)" }}
          >
            <div className="p-2 border-b border-white/10">
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
                <Search className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                {/* Visually hidden label: the placeholder is not a label. */}
                <label htmlFor={searchId} className="sr-only">
                  {searchLabel}
                </label>
                <Combobox.Input
                  id={searchId}
                  placeholder="Search…"
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>
            </div>
            <Combobox.Empty className="px-3 py-2 text-sm text-slate-500 empty:hidden">
              No matches
            </Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto py-1">
              {(group: OptionGroup) => (
                <Combobox.Group key={group.value} items={group.items}>
                  {includeMetals && (
                    <Combobox.GroupLabel
                      className={cn(
                        "px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-600",
                        group.value === "Commodities" && "border-t border-white/5 mt-1 pt-2"
                      )}
                    >
                      {group.value}
                    </Combobox.GroupLabel>
                  )}
                  <Combobox.Collection>
                    {(o: Option) => (
                      <Combobox.Item
                        key={o.code}
                        value={o}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 text-sm cursor-pointer transition-colors",
                          "data-[highlighted]:bg-white/10 data-[selected]:bg-[#6366f1]/10 data-[selected]:text-[#6366f1]"
                        )}
                      >
                        <span className="text-base" aria-hidden="true">{o.icon}</span>
                        <span className="font-mono font-semibold text-white w-10">{o.code}</span>
                        <span className="text-slate-400 truncate">{o.name}</span>
                      </Combobox.Item>
                    )}
                  </Combobox.Collection>
                </Combobox.Group>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
