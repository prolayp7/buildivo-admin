"use client";

import { useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

// A curated set of real Material Symbols names relevant to a DIY/hardware
// storefront's departments and menu links - the full icon set runs into the
// thousands, so this stays a fixed, searchable list rather than trying to
// enumerate (or worse, guess at) every icon name that exists.
export const ICON_OPTIONS = [
  "bolt", "construction", "hardware", "electrical_services", "plumbing", "yard", "foundation",
  "format_paint", "shield_person", "inventory_2", "local_fire_department", "star", "star_outline",
  "shopping_cart", "shopping_bag", "favorite", "favorite_border", "local_shipping", "storefront",
  "category", "home", "search", "help", "help_outline", "mail", "phone", "location_on",
  "verified_user", "workspace_premium", "credit_card", "receipt_long", "handyman", "build",
  "settings", "done", "check_circle", "add", "close", "menu", "person", "group",
  "calendar_month", "event", "price_change", "sell", "new_releases", "local_offer", "percent",
  "warehouse", "engineering", "precision_manufacturing", "water_drop", "lightbulb", "grass",
  "park", "deck", "countertops", "ac_unit", "thermostat", "cleaning_services", "carpenter",
  "forest", "eco", "recycling", "local_mall", "redeem", "loyalty", "payments",
  "account_balance_wallet", "request_quote", "description", "campaign", "notifications", "info",
  "warning", "lock", "visibility", "thumb_up", "chat", "support_agent", "headset_mic",
  "schedule", "update", "sync", "refresh", "share", "print", "qr_code",
  "cached", "price_check", "assignment_return",
] as const;

function MaterialIcon({ name, className }: { name: string; className?: string }) {
  return (
    <span aria-hidden className={cn("material-symbols-outlined", className)}>
      {name}
    </span>
  );
}

export function IconPicker({ value, onChange, placeholder = "Choose an icon" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-10 w-full justify-between px-3 font-normal"
          />
        }
      >
        <span className="flex items-center gap-2 text-[13px] text-ink">
          {value ? <MaterialIcon name={value} className="text-[18px] text-ink-secondary" /> : null}
          {value || <span className="text-ink-faint">{placeholder}</span>}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search icons…" />
          <CommandList className="max-h-64">
            <CommandEmpty>No matching icon.</CommandEmpty>
            <CommandGroup>
              <div className="grid grid-cols-6 gap-1 p-2">
                {ICON_OPTIONS.map((name) => (
                  <CommandItem
                    key={name}
                    value={name}
                    onSelect={() => {
                      onChange(name);
                      setOpen(false);
                    }}
                    aria-label={name}
                    title={name}
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-md p-0",
                      value === name && "bg-accent-tint ring-1 ring-inset ring-accent-strong",
                    )}
                  >
                    <MaterialIcon name={name} className="text-[20px]" />
                  </CommandItem>
                ))}
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
