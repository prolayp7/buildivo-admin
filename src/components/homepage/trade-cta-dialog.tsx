"use client";

import { FormEvent, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { IconPicker } from "@/components/ui/icon-picker";

export interface TradeCtaConfig {
  badgeLabel: string; heading: string; description: string;
  stat1Value: string; stat1Label: string; stat1Caption: string;
  stat2Icon: string; stat2Label: string; stat2Caption: string;
  stat3Icon: string; stat3Label: string; stat3Caption: string;
  ctaLabel: string; ctaHref: string; microcopy: string;
  previewBrand: string; previewStatus: string; previewHolderName: string;
  previewCreditLimit: string; previewTerms: string; previewCardMask: string; previewExpiry: string;
}

const DEFAULTS: TradeCtaConfig = {
  badgeLabel: "Official Trade Contractor Scheme",
  heading: "Unlock Net Pricing & 30-Day Credit Lines",
  description: "Power your jobs with instant approvals, volume tiered rates on daily consumables, and guaranteed delivery direct to active jobsites before 9:00 AM.",
  stat1Value: "Up to 15%", stat1Label: "Trade Discount", stat1Caption: "Tiered rebates applied to invoicing",
  stat2Icon: "support_agent", stat2Label: "Dedicated Manager", stat2Caption: "Direct phone desk for instant tender quotes",
  stat3Icon: "location_on", stat3Label: "Instant Jobsite Drops", stat3Caption: "What3words geofenced drop-offs",
  ctaLabel: "Apply for Trade Account", ctaHref: "/trade",
  microcopy: "Instant 2-minute soft-check application (Companies House verified)",
  previewBrand: "BUILDIVO PRO", previewStatus: "Active", previewHolderName: "Apex Mechanical & Electrical Ltd",
  previewCreditLimit: "£25,000.00", previewTerms: "Net 30 Days", previewCardMask: "•••• 9842", previewExpiry: "12/28",
};

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
function apiMessage(payload: unknown, fallback: string) { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; }
function field<K extends keyof TradeCtaConfig>(config: TradeCtaConfig, set: (config: TradeCtaConfig) => void, key: K) {
  return { value: config[key], onChange: (value: string) => set({ ...config, [key]: value }) };
}

export function TradeCtaDialog({ sectionId, initialConfig, onClose, onSaved }: { sectionId: number; initialConfig: Partial<TradeCtaConfig>; onClose: () => void; onSaved: () => Promise<void> }) {
  const [config, setConfig] = useState<TradeCtaConfig>({ ...DEFAULTS, ...initialConfig });
  const [saving, setSaving] = useState(false), [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const response = await fetch(`/api/homepage-sections/${sectionId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ config }) });
      const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(apiMessage(payload, "Trade CTA content could not be saved."));
      onClose(); await onSaved();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Trade CTA content could not be saved."); } finally { setSaving(false); }
  }

  function text(key: keyof TradeCtaConfig, label: string, placeholder?: string) {
    const f = field(config, setConfig, key);
    return <label className="block text-[13px] font-semibold text-ink-secondary">{label}<input value={f.value} onChange={(event) => f.onChange(event.target.value)} placeholder={placeholder} className={inputClass} /></label>;
  }
  function icon(key: "stat2Icon" | "stat3Icon", label: string) {
    const f = field(config, setConfig, key);
    return <label className="block text-[13px] font-semibold text-ink-secondary">{label}<IconPicker value={f.value} onChange={f.onChange} /></label>;
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}><DialogContent className="top-0 right-0 left-auto flex h-full max-w-2xl translate-x-0 translate-y-0 flex-col rounded-none data-open:slide-in-from-right data-open:zoom-in-100 data-closed:slide-out-to-right data-closed:zoom-out-100">
    <DialogHeader><DialogTitle>Edit trade CTA content</DialogTitle><DialogDescription>The trade account signup banner shown on the storefront homepage.</DialogDescription></DialogHeader>
    <form onSubmit={(event) => void submit(event)} className="flex min-h-0 flex-1 flex-col">
      {error ? <div role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {text("badgeLabel", "Badge label", "Official Trade Contractor Scheme")}
        {text("heading", "Heading", "Unlock Net Pricing & 30-Day Credit Lines")}
        <label className="block text-[13px] font-semibold text-ink-secondary">Description<textarea value={config.description} onChange={(event) => setConfig({ ...config, description: event.target.value })} rows={3} className={`${inputClass} h-auto resize-y py-2`} /></label>

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">Stat card 1 (no icon)</p>
          <div className="mt-3 space-y-3">{text("stat1Value", "Value", "Up to 15%")}{text("stat1Label", "Label", "Trade Discount")}{text("stat1Caption", "Caption")}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">Stat card 2</p>
          <div className="mt-3 space-y-3">{icon("stat2Icon", "Icon")}{text("stat2Label", "Label", "Dedicated Manager")}{text("stat2Caption", "Caption")}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">Stat card 3</p>
          <div className="mt-3 space-y-3">{icon("stat3Icon", "Icon")}{text("stat3Label", "Label", "Instant Jobsite Drops")}{text("stat3Caption", "Caption")}</div>
        </div>

        {text("ctaLabel", "CTA button label", "Apply for Trade Account")}
        {text("ctaHref", "CTA link", "/trade")}
        {text("microcopy", "Microcopy line", "Instant 2-minute soft-check application…")}

        <div className="rounded-lg border border-border bg-surface p-3">
          <p className="text-[13px] font-semibold text-ink">Account preview card</p>
          <p className="mt-1 text-[10.5px] text-ink-muted">An illustrative mock account card - not a real customer&apos;s data.</p>
          <div className="mt-3 space-y-3">
            {text("previewBrand", "Brand name", "BUILDIVO PRO")}
            {text("previewStatus", "Status", "Active")}
            {text("previewHolderName", "Account holder name", "Apex Mechanical & Electrical Ltd")}
            {text("previewCreditLimit", "Credit limit", "£25,000.00")}
            {text("previewTerms", "Terms", "Net 30 Days")}
            {text("previewCardMask", "Card mask", "•••• 9842")}
            {text("previewExpiry", "Expiry", "12/28")}
          </div>
        </div>
      </div>
      <DialogFooter className="mt-4 rounded-none"><button type="button" onClick={onClose} className="h-9 rounded-md border border-border px-4 text-xs font-semibold text-ink-secondary">Cancel</button><button type="submit" disabled={saving} className="inline-flex h-9 items-center gap-2 rounded-md bg-ink px-4 text-xs font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Save</button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
