"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";

export interface CalculatorsConfig {
  eyebrow: string; heading: string; description: string;
  calc1Icon: string; calc1Label: string; calc1Caption: string;
  calc2Icon: string; calc2Label: string; calc2Caption: string;
  calc3Icon: string; calc3Label: string; calc3Caption: string;
}

const DEFAULTS: CalculatorsConfig = {
  eyebrow: "Jobsite Estimation Suite",
  heading: "Interactive Material Calculators",
  description: "Prevent site waste and calculate exact quantities for tile, paint coverage, concrete pours, and laminate flooring with automatic 10% wastage allowance.",
  calc1Icon: "architecture", calc1Label: "Concrete & Mortar Volume", calc1Caption: "Calculates cubic meters, ballast & cement bags for footings and slabs.",
  calc2Icon: "format_paint", calc2Label: "Paint Coverage & Primer", calc2Caption: "Coat multipliers for masonry, emulsion, gloss, and exterior cladding.",
  calc3Icon: "view_agenda", calc3Label: "Flooring & Underlay Packs", calc3Caption: "Pack box rounding with expansion gap perimeter formulas.",
};

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function field<K extends keyof CalculatorsConfig>(config: CalculatorsConfig, set: (config: CalculatorsConfig) => void, key: K) {
  return { value: config[key], onChange: (value: string) => set({ ...config, [key]: value }) };
}

export function CalculatorsDialog({ sectionId, initialConfig, onClose, onSaved }: { sectionId: number; initialConfig: Partial<CalculatorsConfig>; onClose: () => void; onSaved: () => Promise<void> }) {
  const [config, setConfig] = useState<CalculatorsConfig>({ ...DEFAULTS, ...initialConfig });
  const [saving, setSaving] = useState(false), [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(`/api/homepage-sections/${sectionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Calculators content could not be saved."));
      onClose(); await onSaved();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Calculators content could not be saved."); } finally { setSaving(false); }
  }

  function text(key: keyof CalculatorsConfig, label: string, placeholder?: string) {
    const f = field(config, setConfig, key);
    return <label className="block text-[13px] font-semibold text-ink-secondary">{label}<input value={f.value} onChange={(event) => f.onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
  }
  function icon(key: "calc1Icon" | "calc2Icon" | "calc3Icon", label: string) {
    const f = field(config, setConfig, key);
    return <label className="block text-[13px] font-semibold text-ink-secondary">{label}<IconPicker value={f.value} onChange={f.onChange} /></label>;
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="top-0 right-0 left-auto flex h-full max-w-2xl translate-x-0 translate-y-0 flex-col rounded-none data-open:slide-in-from-right data-open:zoom-in-100 data-closed:slide-out-to-right data-closed:zoom-out-100">
    <DialogHeader><DialogTitle>Edit calculators content</DialogTitle><DialogDescription>The jobsite material calculators section shown on the storefront homepage. The interactive tile calculator itself isn&apos;t editable here.</DialogDescription></DialogHeader>
    <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      {error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {text("eyebrow", "Eyebrow label", "Jobsite Estimation Suite")}
        {text("heading", "Heading", "Interactive Material Calculators")}
        <label className="block text-[13px] font-semibold text-ink-secondary">Description<textarea value={config.description} onChange={(event) => setConfig({ ...config, description: event.target.value })} rows={3} className={`${inputClass} h-auto resize-y py-2`} /></label>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">Calculator link 1</p>
          <div className="mt-3 space-y-3">{icon("calc1Icon", "Icon")}{text("calc1Label", "Label", "Concrete & Mortar Volume")}{text("calc1Caption", "Caption")}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">Calculator link 2</p>
          <div className="mt-3 space-y-3">{icon("calc2Icon", "Icon")}{text("calc2Label", "Label", "Paint Coverage & Primer")}{text("calc2Caption", "Caption")}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">Calculator link 3</p>
          <div className="mt-3 space-y-3">{icon("calc3Icon", "Icon")}{text("calc3Label", "Label", "Flooring & Underlay Packs")}{text("calc3Caption", "Caption")}</div>
        </div>
      </div>
      <DialogFooter className="mt-4 rounded-none"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
