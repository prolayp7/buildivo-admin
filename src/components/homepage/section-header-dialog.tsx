"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AlertTriangle, ExternalLink, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type SectionHeaderConfig = { heading: string; linkLabel: string; linkHref: string };

/** The automatic sections: their items come from elsewhere, only the heading and "view all" link are set here. */
const SECTIONS: Record<"DEPARTMENTS" | "FEATURED_PRODUCTS", { title: string; description: string; defaults: SectionHeaderConfig; itemsHref: string; itemsLabel: string }> = {
  DEPARTMENTS: {
    title: "Edit Shop by Department",
    description: "The tiles are every top-level category, with the icon and product count from Categories.",
    defaults: { heading: "Shop by Department", linkLabel: "View all products", linkHref: "/c/power-tools" },
    itemsHref: "/categories", itemsLabel: "Manage categories",
  },
  FEATURED_PRODUCTS: {
    title: "Edit Featured Pro Tools",
    description: "Shows the four best-selling products, worked out from real orders.",
    defaults: { heading: "Featured Pro Tools", linkLabel: "Shop all Power Tools", linkHref: "/c/power-tools" },
    itemsHref: "/products", itemsLabel: "Manage products",
  },
};

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const validHref = (href: string) => /^(\/(?!\/)|https?:\/\/)\S*$/i.test(href.trim());
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }

export function SectionHeaderDialog({ type, sectionId, initialConfig, onClose, onSaved }: { type: keyof typeof SECTIONS; sectionId: number; initialConfig: Record<string, unknown>; onClose: () => void; onSaved: () => Promise<void> }) {
  const section = SECTIONS[type];
  const initial = (key: keyof SectionHeaderConfig) => (typeof initialConfig[key] === "string" ? (initialConfig[key] as string) : section.defaults[key]);
  const [config, setConfig] = useState<SectionHeaderConfig>({ heading: initial("heading"), linkLabel: initial("linkLabel"), linkHref: initial("linkHref") });
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const hrefError = config.linkHref.trim() && !validHref(config.linkHref) ? "Use a storefront path such as /c/power-tools, or a full https:// address." : "";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (hrefError) return;
    setSaving(true); setError("");
    // Merged into the saved config; empty fields fall back to the built-in copy on the storefront.
    const next = { ...initialConfig, heading: config.heading.trim(), linkLabel: config.linkLabel.trim(), linkHref: config.linkHref.trim() };
    try {
      const response = await fetch(`/api/homepage-sections/${sectionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config: next }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "The section could not be saved."));
      onClose(); await onSaved();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The section could not be saved."); } finally { setSaving(false); }
  }

  const label = "block text-[13px] font-semibold text-ink-secondary";
  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="top-0 right-0 left-auto flex h-full max-w-2xl translate-x-0 translate-y-0 flex-col rounded-none data-open:slide-in-from-right data-open:zoom-in-100 data-closed:slide-out-to-right data-closed:zoom-out-100">
    <DialogHeader><DialogTitle>{section.title}</DialogTitle><DialogDescription>{section.description}</DialogDescription></DialogHeader>
    <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      {error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        <label className={label}>Heading<input value={config.heading} onChange={(event) => setConfig({ ...config, heading: event.target.value })} maxLength={120} placeholder={section.defaults.heading} className={inputClass} /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Link text<input value={config.linkLabel} onChange={(event) => setConfig({ ...config, linkLabel: event.target.value })} maxLength={60} placeholder={section.defaults.linkLabel} className={inputClass} /></label>
          <label className={label}>Link address<input value={config.linkHref} onChange={(event) => setConfig({ ...config, linkHref: event.target.value })} maxLength={300} placeholder={section.defaults.linkHref} className={`${inputClass} font-mono`} />{hrefError ? <span className="mt-1 block text-xs font-normal text-danger-tint-ink">{hrefError}</span> : null}</label>
        </div>
        <p className="text-xs text-ink-muted">Leave a field empty to use the original text shown as its placeholder.</p>
        <Link href={section.itemsHref} className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary underline underline-offset-2 hover:text-ink">{section.itemsLabel}<ExternalLink className="h-3.5 w-3.5" /></Link>
      </div>
      <DialogFooter className="mt-4 rounded-none"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving || Boolean(hrefError)} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
