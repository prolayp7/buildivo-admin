"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowDown, ArrowUp, Calculator, ExternalLink, Grid3x3, Handshake, LayoutTemplate, LoaderCircle, Package, RefreshCw, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { collectionFromApi } from "@/lib/api-response";
import { TradeCtaDialog } from "./trade-cta-dialog";
import { CalculatorsDialog } from "./calculators-dialog";
import { EcosystemMatcherDialog } from "./ecosystem-matcher-dialog";
import { ProjectKitsDialog } from "./project-kits-dialog";

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3002";

type SectionType = "HERO" | "TRUST_STRIP" | "DEPARTMENTS" | "FEATURED_PRODUCTS" | "PROJECT_KITS" | "TRADE_CTA" | "CALCULATORS" | "ECOSYSTEM_MATCHER";
type Section = { id: number; type: SectionType; label: string; sortOrder: number; isVisible: boolean; config: Record<string, string> };

function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }

// One row per section that actually renders on the storefront homepage
// (buildivo's src/app/(storefront)/page.tsx), in that page's real order.
// This panel only controls whether each section shows - the page's layout
// and order are fixed in code, not admin-configurable.
const meta: Record<SectionType, { icon: typeof LayoutTemplate; description: string }> = {
  HERO: { icon: LayoutTemplate, description: "Homepage hero carousel." },
  TRUST_STRIP: { icon: ShieldCheck, description: "Delivery, warranty and price-match trust badges." },
  DEPARTMENTS: { icon: Grid3x3, description: "Automatic — top-level category tiles." },
  FEATURED_PRODUCTS: { icon: Sparkles, description: "Automatic — products flagged as featured." },
  PROJECT_KITS: { icon: Package, description: "Turnkey project material bundles." },
  TRADE_CTA: { icon: Handshake, description: "Trade account signup banner." },
  CALCULATORS: { icon: Calculator, description: "Jobsite material calculators." },
  ECOSYSTEM_MATCHER: { icon: Zap, description: "Battery ecosystem matcher tool." },
};
// Where each section's actual content is authored, for the types that have
// one - this panel only controls order/visibility, never the content itself.
const contentLink: Partial<Record<SectionType, string>> = { HERO: "/merchandising", TRUST_STRIP: "/merchandising", DEPARTMENTS: "/categories", FEATURED_PRODUCTS: "/products" };
// Section types with an in-panel content editor (via `config`), rather than a
// deep-link to another page.
const configEditableTypes = ["PROJECT_KITS", "TRADE_CTA", "CALCULATORS", "ECOSYSTEM_MATCHER"] as const;
type ConfigEditableType = (typeof configEditableTypes)[number];

export function HomepageListing() {
  const [items, setItems] = useState<Section[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [editingSection, setEditingSection] = useState<{ type: ConfigEditableType; section: Section } | null>(null);

  const load = useCallback(async () => { setLoading(true); setError(""); try { const response = await fetch("/api/homepage-sections", { cache: "no-store" }); const payload = await response.json(); if (!response.ok) throw new Error(apiMessage(payload, "Homepage sections could not be loaded.")); setItems(collectionFromApi<Section>(payload)); setPreviewKey((key) => key + 1); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Homepage sections could not be loaded."); } finally { setLoading(false); } }, []);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, [load]);

  async function toggleVisible(section: Section) { setError(""); try { const response = await fetch(`/api/homepage-sections/${section.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isVisible: !section.isVisible }) }); if (!response.ok) throw new Error(apiMessage(await response.json().catch(() => ({})), "Section could not be updated.")); await load(); } catch (toggleError) { setError(toggleError instanceof Error ? toggleError.message : "Section could not be updated."); } }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setSaving(true); setError("");
    try { const response = await fetch("/api/homepage-sections/reorder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: next.map((item) => item.id) }) }); if (!response.ok) throw new Error(apiMessage(await response.json().catch(() => ({})), "Sections could not be reordered.")); await load(); } catch (moveError) { setError(moveError instanceof Error ? moveError.message : "Sections could not be reordered."); await load(); } finally { setSaving(false); }
  }

  return <div className="w-full">
  {error ? <div role="alert" className="mb-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
  <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
    <div className="min-w-0 xl:w-[380px] xl:shrink-0">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Homepage</h1><p className="mt-1 text-[13.5px] text-ink-muted">Show or hide homepage sections without a deployment. Layout and order are fixed on the storefront.</p>
      <div className="mt-5">{loading ? <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-ink-muted" /></div> : <div className="space-y-2.5">{items.map((section, index) => {
      const Icon = meta[section.type].icon;
      const link = contentLink[section.type];
      return <div key={section.id} className="rounded-xl border border-border bg-surface p-3.5 shadow-card">
        <div className="flex items-start gap-2.5">
          <div className="flex shrink-0 flex-col gap-0.5"><button type="button" onClick={() => void move(index, -1)} disabled={saving || index === 0} aria-label="Move up" className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button><button type="button" onClick={() => void move(index, 1)} disabled={saving || index === items.length - 1} aria-label="Move down" className="flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-neutral-tint disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button></div>
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-canvas text-[11px] font-semibold text-ink-secondary">{index + 1}</span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-neutral-tint text-ink-muted"><Icon className="h-4 w-4" /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-semibold text-ink">{section.label}</p><p className="mt-0.5 text-xs text-ink-muted">{meta[section.type].description}</p></div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary"><span className="relative inline-flex h-5 w-9 shrink-0"><input type="checkbox" checked={section.isVisible} onChange={() => void toggleVisible(section)} className="peer sr-only" /><span className="absolute inset-0 rounded-full bg-border-strong transition-colors peer-checked:bg-positive" /><span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" /></span>{section.isVisible ? "Visible" : "Hidden"}</label>
          {link ? <Link href={link} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit content<ExternalLink className="h-3.5 w-3.5" /></Link> : (configEditableTypes as readonly SectionType[]).includes(section.type) ? <button type="button" onClick={() => setEditingSection({ type: section.type as ConfigEditableType, section })} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">Edit content</button> : <span className="text-xs text-ink-faint">No settings</span>}
        </div>
      </div>;
    })}</div>}</div>
    </div>
    <div className="min-w-0 flex-1 xl:sticky xl:top-5"><div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5"><p className="text-[13px] font-semibold text-ink">Live preview</p><div className="flex items-center gap-1"><button type="button" onClick={() => setPreviewKey((key) => key + 1)} aria-label="Refresh preview" className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><RefreshCw className="h-3.5 w-3.5" /></button><a href={STOREFRONT_URL} target="_blank" rel="noreferrer" aria-label="Open storefront in a new tab" className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint hover:text-ink"><ExternalLink className="h-3.5 w-3.5" /></a></div></div>
      <iframe key={previewKey} src={STOREFRONT_URL} title="Storefront live preview" className="h-[80vh] w-full border-0 bg-canvas" />
    </div></div>
  </div>
  {editingSection?.type === "PROJECT_KITS" ? <ProjectKitsDialog sectionId={editingSection.section.id} initialConfig={editingSection.section.config} onClose={() => setEditingSection(null)} onSaved={load} /> : null}
  {editingSection?.type === "TRADE_CTA" ? <TradeCtaDialog sectionId={editingSection.section.id} initialConfig={editingSection.section.config} onClose={() => setEditingSection(null)} onSaved={load} /> : null}
  {editingSection?.type === "CALCULATORS" ? <CalculatorsDialog sectionId={editingSection.section.id} initialConfig={editingSection.section.config} onClose={() => setEditingSection(null)} onSaved={load} /> : null}
  {editingSection?.type === "ECOSYSTEM_MATCHER" ? <EcosystemMatcherDialog sectionId={editingSection.section.id} initialConfig={editingSection.section.config} onClose={() => setEditingSection(null)} onSaved={load} /> : null}
  </div>;
}
