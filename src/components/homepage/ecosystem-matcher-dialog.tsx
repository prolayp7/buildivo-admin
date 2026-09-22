"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface EcosystemMatcherConfig {
  badgeLabel: string;
  heading: string;
  description: string;
  previewHeading: string;
  previewDescription: string;
  previewCtaLabel: string;
  previewCaption: string;
}

const DEFAULTS: EcosystemMatcherConfig = {
  badgeLabel: "Ecosystem Matcher",
  heading: "Match Your Battery Platform & Bare Tools",
  description: "Never buy the wrong voltage or redundant chargers. Select your existing battery system to instantly filter thousands of 100% compatible naked tools.",
  previewHeading: "Already own the battery?",
  previewDescription: "Build your next kit around it. Explore bare tools without another battery or charger.",
  previewCtaLabel: "Explore bare tools",
  previewCaption: "Check each tool's platform before you buy.",
};

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function field<K extends keyof EcosystemMatcherConfig>(config: EcosystemMatcherConfig, set: (config: EcosystemMatcherConfig) => void, key: K) {
  return { value: config[key], onChange: (value: string) => set({ ...config, [key]: value }) };
}

export function EcosystemMatcherDialog({ sectionId, initialConfig, onClose, onSaved }: { sectionId: number; initialConfig: Partial<EcosystemMatcherConfig>; onClose: () => void; onSaved: () => Promise<void> }) {
  const [config, setConfig] = useState<EcosystemMatcherConfig>({ ...DEFAULTS, ...initialConfig });
  const [saving, setSaving] = useState(false), [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(`/api/homepage-sections/${sectionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Ecosystem matcher content could not be saved."));
      onClose(); await onSaved();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Ecosystem matcher content could not be saved."); } finally { setSaving(false); }
  }

  function text(key: keyof EcosystemMatcherConfig, label: string, placeholder?: string) {
    const f = field(config, setConfig, key);
    return <label className="block text-[13px] font-semibold text-ink-secondary">{label}<input value={f.value} onChange={(event) => f.onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="top-0 right-0 left-auto flex h-full max-w-2xl translate-x-0 translate-y-0 flex-col rounded-none data-open:slide-in-from-right data-open:zoom-in-100 data-closed:slide-out-to-right data-closed:zoom-out-100">
    <DialogHeader><DialogTitle>Edit ecosystem matcher content</DialogTitle><DialogDescription>The battery platform matcher section shown on the storefront homepage. The brand/category filter itself isn&apos;t editable here.</DialogDescription></DialogHeader>
    <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      {error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {text("badgeLabel", "Badge label", "Ecosystem Matcher")}
        {text("heading", "Heading", "Match Your Battery Platform & Bare Tools")}
        <label className="block text-[13px] font-semibold text-ink-secondary">Description<textarea value={config.description} onChange={(event) => setConfig({ ...config, description: event.target.value })} rows={3} className={`${inputClass} h-auto resize-y py-2`} /></label>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">Preview card</p>
          <p className="mt-1 text-[10.5px] text-ink-muted">The dark &quot;already own the battery?&quot; card on the right.</p>
          <div className="mt-3 space-y-3">
            {text("previewHeading", "Heading", "Already own the battery?")}
            <label className="block text-[13px] font-semibold text-ink-secondary">Description<textarea value={config.previewDescription} onChange={(event) => setConfig({ ...config, previewDescription: event.target.value })} rows={2} className={`${inputClass} h-auto resize-y py-2`} /></label>
            {text("previewCtaLabel", "CTA button label", "Explore bare tools")}
            {text("previewCaption", "Caption", "Check each tool's platform before you buy.")}
          </div>
        </div>
      </div>
      <DialogFooter className="mt-4 rounded-none"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
