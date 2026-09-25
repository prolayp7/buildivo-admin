"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, ExternalLink, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { IconPicker } from "@/components/ui/icon-picker";

type Badge = { icon: string; title: string; caption: string };
type Chip = { label: string; tone: "success" | "info" | "neutral" };
type Method = { label: string; highlight: boolean };
type LinkItem = { label: string; href: string };
const PLATFORMS = [["facebook", "Facebook"], ["instagram", "Instagram"], ["linkedin", "LinkedIn"], ["youtube", "YouTube"], ["x", "X (Twitter)"]] as const;
type Social = Record<(typeof PLATFORMS)[number][0], string>;
type FooterConfig = {
  trustBadges: Badge[]; aboutHeading: string; aboutText: string; certifications: Chip[];
  showGateways: boolean; paymentMethods: Method[]; legalLinks: LinkItem[]; social: Social; copyright: string; complianceBadge: string;
};

const inputClass = "mt-1.5 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "block text-xs font-semibold text-ink-secondary";
const cardClass = "rounded-xl border border-border bg-surface p-5 shadow-card";
const message = (payload: unknown, fallback: string) => { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; };

function Section({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return <section className={cardClass}><h2 className="text-sm font-semibold text-ink">{title}</h2><p className="mt-1 text-xs text-ink-muted">{description}</p><div className="mt-4">{children}</div></section>;
}

// Ordered list of editable rows with add / move / delete, shared by every repeatable footer section.
function RowList<T>({ items, onChange, render, blank, addLabel, max, empty }: { items: T[]; onChange: (items: T[]) => void; render: (item: T, update: (patch: Partial<T>) => void, index: number) => ReactNode; blank: T; addLabel: string; max: number; empty: string }) {
  const move = (index: number, delta: -1 | 1) => { const next = [...items]; [next[index], next[index + delta]] = [next[index + delta], next[index]]; onChange(next); };
  const button = "flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-neutral-tint hover:text-ink disabled:pointer-events-none disabled:opacity-30";
  return (
    <div className="space-y-2.5">
      {items.length === 0 ? <p className="rounded-md border border-dashed border-border-strong bg-canvas p-4 text-center text-xs text-ink-muted">{empty}</p> : null}
      {items.map((item, index) => (
        <div key={index} className="flex items-start gap-2 rounded-lg border border-border bg-canvas p-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">{render(item, (patch) => onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row))), index)}</div>
          <div className="mt-1.5 flex shrink-0 items-center">
            <button type="button" className={button} disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up"><ArrowUp className="h-4 w-4" /></button>
            <button type="button" className={button} disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down"><ArrowDown className="h-4 w-4" /></button>
            <button type="button" className={`${button} hover:bg-danger-tint hover:text-danger`} onClick={() => onChange(items.filter((_, i) => i !== index))} aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>
      ))}
      <button type="button" disabled={items.length >= max} onClick={() => onChange([...items, blank])} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-xs font-semibold text-ink-secondary hover:border-ink hover:text-ink disabled:opacity-40"><Plus className="h-3.5 w-3.5" />{addLabel}{items.length >= max ? ` (max ${max})` : ""}</button>
    </div>
  );
}

export function FooterSettingsPage() {
  const [config, setConfig] = useState<FooterConfig | null>(null);
  const [gateways, setGateways] = useState<string[]>([]);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/settings/footer", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(message(payload, "Footer settings could not be loaded."));
        const { gateways: enabled, ...rest } = payload.data as FooterConfig & { gateways: string[] };
        setConfig(rest); setGateways(enabled ?? []);
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Footer settings could not be loaded."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!config) return <div className="flex min-h-80 items-center justify-center">{error ? <p role="alert" className="flex items-center gap-2 text-sm text-danger-tint-ink"><AlertTriangle className="h-4 w-4" />{error}</p> : <LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" />}</div>;

  const set = (patch: Partial<FooterConfig>) => setConfig({ ...config, ...patch });

  async function save() {
    if (!config) return;
    const clean: FooterConfig = {
      ...config,
      trustBadges: config.trustBadges.map((b) => ({ ...b, title: b.title.trim(), caption: b.caption.trim() })).filter((b) => b.title),
      certifications: config.certifications.map((c) => ({ ...c, label: c.label.trim() })).filter((c) => c.label),
      paymentMethods: config.paymentMethods.map((m) => ({ ...m, label: m.label.trim() })).filter((m) => m.label),
      legalLinks: config.legalLinks.map((l) => ({ label: l.label.trim(), href: l.href.trim() })),
      social: Object.fromEntries(PLATFORMS.map(([key]) => [key, config.social[key].trim()])) as Social,
    };
    const badLink = clean.legalLinks.find((l) => !l.label || !/^(\/(?!\/)|https?:\/\/|mailto:|tel:|#)\S*$/i.test(l.href));
    if (badLink) { setError("Each legal link needs a label and a URL that starts with /, https://, mailto: or tel:."); return; }
    const badSocial = PLATFORMS.find(([key]) => clean.social[key] && !/^https?:\/\/\S+$/i.test(clean.social[key]));
    if (badSocial) { setError(`${badSocial[1]} must be a full URL starting with https://.`); return; }
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/settings/footer", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, "Footer settings could not be saved."));
      setConfig(clean);
      toast.success("Footer saved. It appears on the storefront within about 20 seconds.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Footer settings could not be saved."); } finally { setSaving(false); }
  }

  return (
    <div className="w-full pb-20">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Footer</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Everything shown in the storefront footer. Changes appear on the storefront within about 20 seconds of saving.</p>
      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <div className="mt-5 max-w-4xl space-y-5">
          <Section title="Trust strip" description="The row of reassurance badges at the very top of the footer.">
              <RowList items={config.trustBadges} onChange={(trustBadges) => set({ trustBadges })} max={8} addLabel="Add badge" empty="No badges. The trust strip is hidden." blank={{ icon: "verified", title: "", caption: "" }}
                render={(item, update) => (<>
                  <div><span className={labelClass}>Icon</span><IconPicker value={item.icon} onChange={(icon) => update({ icon })} /></div>
                  <label className={labelClass}>Title<input value={item.title} onChange={(event) => update({ title: event.target.value })} maxLength={80} placeholder="e.g. 30-Day Guarantee" className={inputClass} /></label>
                  <label className={labelClass}>Caption<input value={item.caption} onChange={(event) => update({ caption: event.target.value })} maxLength={120} placeholder="Short supporting line" className={inputClass} /></label>
                </>)} />
            </Section>

          <Section title="Link columns" description="The columns of links (Departments, Trade & Wholesale, Customer Support, Guides & Tools) come from your footer menu.">
              <Link href="/menus" className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong bg-surface px-3 text-xs font-semibold text-ink-secondary hover:border-ink hover:text-ink">Edit the footer menu<ExternalLink className="h-3.5 w-3.5" /></Link>
            </Section>

          <Section title="About" description="The text block beside the link columns, with optional certification chips.">
              <label className={labelClass}>Heading<input value={config.aboutHeading} onChange={(event) => set({ aboutHeading: event.target.value })} maxLength={80} className={inputClass} /></label>
              <label className={`${labelClass} mt-3`}>Text<textarea value={config.aboutText} onChange={(event) => set({ aboutText: event.target.value })} maxLength={600} rows={4} className={`${inputClass} h-auto resize-y py-2`} /></label>
              <p className="mb-2 mt-4 text-xs font-semibold text-ink-secondary">Certification chips</p>
              <RowList items={config.certifications} onChange={(certifications) => set({ certifications })} max={6} addLabel="Add chip" empty="No chips." blank={{ label: "", tone: "neutral" as const }}
                render={(item, update) => (<>
                  <label className={labelClass}>Label<input value={item.label} onChange={(event) => update({ label: event.target.value })} maxLength={40} placeholder="e.g. ISO 9001:2015" className={inputClass} /></label>
                  <label className={labelClass}>Colour<select value={item.tone} onChange={(event) => update({ tone: event.target.value as Chip["tone"] })} className={inputClass}><option value="success">Green</option><option value="info">Blue</option><option value="neutral">White</option></select></label>
                </>)} />
            </Section>

          <Section title="Social links" description="Only platforms with a URL appear as icons. Leave a field blank to hide it.">
              <div className="grid gap-3 sm:grid-cols-2">
                {PLATFORMS.map(([key, label]) => <label key={key} className={labelClass}>{label}<input type="url" value={config.social[key]} onChange={(event) => set({ social: { ...config.social, [key]: event.target.value } })} placeholder="https://" className={inputClass} /></label>)}
              </div>
            </Section>

          <Section title="Accepted payment methods" description="Shown as chips beside the legal links.">
              <label className="flex items-start gap-3 text-[13px] text-ink-secondary"><input type="checkbox" checked={config.showGateways} onChange={(event) => set({ showGateways: event.target.checked })} className="mt-0.5 h-4 w-4 accent-ink" /><span><span className="font-semibold text-ink">Show the payment gateways I&apos;ve enabled</span><br /><span className="text-xs text-ink-muted">Follows Settings &rsaquo; Integrations, so turning a gateway on or off there updates the footer.</span></span></label>
              <p className="mt-2 rounded-md bg-canvas px-3 py-2 text-xs text-ink-secondary">Currently enabled: {gateways.length ? <strong className="text-ink">{gateways.join(", ")}</strong> : <>none yet. <Link href="/settings" className="font-semibold underline underline-offset-2">Configure a gateway</Link></>}</p>
              <p className="mb-2 mt-4 text-xs font-semibold text-ink-secondary">Other methods (card brands, wallets, trade terms)</p>
              <RowList items={config.paymentMethods} onChange={(paymentMethods) => set({ paymentMethods })} max={12} addLabel="Add method" empty="No extra methods." blank={{ label: "", highlight: false }}
                render={(item, update) => (<>
                  <label className={labelClass}>Label<input value={item.label} onChange={(event) => update({ label: event.target.value })} maxLength={40} placeholder="e.g. VISA" className={inputClass} /></label>
                  <label className="flex items-center gap-2 pt-6 text-[13px] font-medium text-ink-secondary"><input type="checkbox" checked={item.highlight} onChange={(event) => update({ highlight: event.target.checked })} className="h-4 w-4 accent-ink" />Highlight in orange</label>
                </>)} />
            </Section>

          <Section title="Legal links" description="Policy links shown at the bottom right, e.g. Privacy Policy and Terms.">
              <RowList items={config.legalLinks} onChange={(legalLinks) => set({ legalLinks })} max={8} addLabel="Add link" empty="No legal links." blank={{ label: "", href: "" }}
                render={(item, update) => (<>
                  <label className={labelClass}>Label<input value={item.label} onChange={(event) => update({ label: event.target.value })} maxLength={60} placeholder="Privacy Policy" className={inputClass} /></label>
                  <label className={labelClass}>URL<input value={item.href} onChange={(event) => update({ href: event.target.value })} placeholder="/privacy or https://…" className={inputClass} /></label>
                </>)} />
            </Section>

          <Section title="Bottom bar" description={<>The copyright line and compliance badge. Use <code className="rounded bg-canvas px-1">{"{year}"}</code> to insert the current year automatically.</>}>
              <label className={labelClass}>Copyright<input value={config.copyright} onChange={(event) => set({ copyright: event.target.value })} maxLength={200} className={inputClass} /></label>
              <label className={`${labelClass} mt-3`}>Compliance badge<input value={config.complianceBadge} onChange={(event) => set({ complianceBadge: event.target.value })} maxLength={80} placeholder="e.g. PCI-DSS Level 1 Merchant Certified" className={inputClass} /></label>
            </Section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save footer</button></div>
      </div>
    </div>
  );
}
