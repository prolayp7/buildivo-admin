"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ProjectKitsConfig {
  badgeLabel: string;
  heading: string;
  description: string;
  footnote: string;
  kit1Name: string; kit1Description: string; kit1SpecLabel: string; kit1SpecValue: string; kit1Est: string; kit1ItemCount: string;
  kit2Name: string; kit2Description: string; kit2SpecLabel: string; kit2SpecValue: string; kit2Est: string; kit2ItemCount: string;
  kit3Name: string; kit3Description: string; kit3SpecLabel: string; kit3SpecValue: string; kit3Est: string; kit3ItemCount: string;
  kit4Name: string; kit4Description: string; kit4SpecLabel: string; kit4SpecValue: string; kit4Est: string; kit4ItemCount: string;
}

const DEFAULTS: ProjectKitsConfig = {
  badgeLabel: "Turnkey Project Packs",
  heading: "Shop by Complete Job",
  description: "Standardized bills of materials curated with vetted tradespeople. Eliminate missed fixings, incorrect gauge wiring, and return trips.",
  footnote: "All bundles include 5% bulk rebate",
  kit1Name: "Decking & Outdoor Framing", kit1Description: "C24 treated joists, deck boards, weed membrane, joist tape & coach screws.", kit1SpecLabel: "Estimated Area", kit1SpecValue: "25 - 35 m²", kit1Est: "£1,420.00", kit1ItemCount: "24",
  kit2Name: "Complete Bathroom Refit", kit2Description: "Tanking kit, 15mm/22mm copper, JG Speedfit manifolds, tile backer boards.", kit2SpecLabel: "Typical Room Size", kit2SpecValue: "Standard 3-piece", kit2Est: "£2,180.00", kit2ItemCount: "48",
  kit3Name: "Jobsite Electrical Rough-In", kit3Description: "100m drums 2.5mm² T&E, 1.5mm² lighting, dry lining boxes, RCBOs.", kit3SpecLabel: "Scope", kit3SpecValue: "4-Zone Extension", kit3Est: "£895.00", kit3ItemCount: "32",
  kit4Name: "Workshop Storage Build", kit4Description: "Birch plywood sheets, heavy duty steel angle brackets, heavy-duty castors.", kit4SpecLabel: "Bench Spec", kit4SpecValue: "2.4m Heavy Workbench", kit4Est: "£640.00", kit4ItemCount: "18",
};

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function field<K extends keyof ProjectKitsConfig>(config: ProjectKitsConfig, set: (config: ProjectKitsConfig) => void, key: K) {
  return { value: config[key], onChange: (value: string) => set({ ...config, [key]: value }) };
}

export function ProjectKitsDialog({ sectionId, initialConfig, onClose, onSaved }: { sectionId: number; initialConfig: Partial<ProjectKitsConfig>; onClose: () => void; onSaved: () => Promise<void> }) {
  const [config, setConfig] = useState<ProjectKitsConfig>({ ...DEFAULTS, ...initialConfig });
  const [saving, setSaving] = useState(false), [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(`/api/homepage-sections/${sectionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Project kits content could not be saved."));
      onClose(); await onSaved();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Project kits content could not be saved."); } finally { setSaving(false); }
  }

  function text(key: keyof ProjectKitsConfig, label: string, placeholder?: string) {
    const f = field(config, setConfig, key);
    return <label className="block text-[13px] font-semibold text-ink-secondary">{label}<input value={f.value} onChange={(event) => f.onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
  }

  function kitSection(title: string, n: 1 | 2 | 3 | 4) {
    const nameKey = `kit${n}Name` as const, descKey = `kit${n}Description` as const;
    return <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-[13px] font-semibold text-ink">{title}</p>
      <div className="mt-3 space-y-3">
        {text(nameKey, "Name", "Decking & Outdoor Framing")}
        <label className="block text-[13px] font-semibold text-ink-secondary">Description<textarea value={config[descKey]} onChange={(event) => setConfig({ ...config, [descKey]: event.target.value })} rows={2} className={`${inputClass} h-auto resize-y py-2`} /></label>
        {text(`kit${n}SpecLabel` as const, "Stat label", "Estimated Area")}
        {text(`kit${n}SpecValue` as const, "Stat value", "25 - 35 m²")}
        {text(`kit${n}Est` as const, "Est. materials total", "£1,420.00")}
        {text(`kit${n}ItemCount` as const, "Item count", "24")}
      </div>
    </div>;
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="top-0 right-0 left-auto flex h-full max-w-2xl translate-x-0 translate-y-0 flex-col rounded-none data-open:slide-in-from-right data-open:zoom-in-100 data-closed:slide-out-to-right data-closed:zoom-out-100">
    <DialogHeader><DialogTitle>Edit project kits content</DialogTitle><DialogDescription>The &quot;Shop by Complete Job&quot; project bundle cards on the storefront homepage. Card images and the &quot;View Material List&quot; link aren&apos;t editable here.</DialogDescription></DialogHeader>
    <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      {error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {text("badgeLabel", "Badge label", "Turnkey Project Packs")}
        {text("heading", "Heading", "Shop by Complete Job")}
        <label className="block text-[13px] font-semibold text-ink-secondary">Description<textarea value={config.description} onChange={(event) => setConfig({ ...config, description: event.target.value })} rows={3} className={`${inputClass} h-auto resize-y py-2`} /></label>
        {text("footnote", "Footnote", "All bundles include 5% bulk rebate")}
        {kitSection("Kit 1", 1)}
        {kitSection("Kit 2", 2)}
        {kitSection("Kit 3", 3)}
        {kitSection("Kit 4", 4)}
      </div>
      <DialogFooter className="mt-4 rounded-none"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
