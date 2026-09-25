"use client";

import { useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type SearchableOption = { value: string; label: string };

const itemClass = "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-ink outline-none select-none data-[selected=true]:bg-canvas";

// Value "" means "nothing selected"; emptyLabel adds a clearable first row that maps to it.
export function SearchableSelect({ value, onChange, options, placeholder = "Select…", emptyLabel, searchPlaceholder = "Search…", ariaLabel }: {
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  emptyLabel?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const pick = (next: string) => { onChange(next); setOpen(false); };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={ariaLabel}
            aria-expanded={open}
            className="mt-2 flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 text-left text-[13px] outline-none transition-colors hover:border-ink-faint focus-visible:border-accent-strong data-[popup-open]:border-accent-strong"
          />
        }
      >
        <span className={cn("truncate", selected ? "text-ink" : "text-ink-faint")}>{selected?.label ?? emptyLabel ?? placeholder}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-muted transition-transform", open && "rotate-180")} />
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-(--anchor-width) min-w-56 gap-0 overflow-hidden rounded-lg bg-surface p-0 shadow-panel ring-0 border border-border">
        <CommandPrimitive className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-ink-muted" />
            <CommandPrimitive.Input autoFocus placeholder={searchPlaceholder} className="h-10 w-full rounded-none bg-transparent text-[13px] text-ink outline-none! placeholder:text-ink-faint" />
          </div>
          <CommandPrimitive.List className="max-h-60 overflow-y-auto p-1">
            <CommandPrimitive.Empty className="py-6 text-center text-[13px] text-ink-muted">No matches.</CommandPrimitive.Empty>
            {emptyLabel ? (
              <CommandPrimitive.Item value={emptyLabel} onSelect={() => pick("")} className={itemClass}>
                <span className="flex-1 text-ink-muted">{emptyLabel}</span>
                {value === "" ? <Check className="h-4 w-4 text-accent" /> : null}
              </CommandPrimitive.Item>
            ) : null}
            {options.map((option) => (
              <CommandPrimitive.Item key={option.value} value={option.label} onSelect={() => pick(option.value)} className={itemClass}>
                <span className={cn("flex-1 truncate", value === option.value && "font-semibold")}>{option.label}</span>
                {value === option.value ? <Check className="h-4 w-4 text-accent" /> : null}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}
