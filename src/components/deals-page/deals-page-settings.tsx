"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, LoaderCircle, Save, X } from "lucide-react";
import { toast } from "sonner";
import { ProductPicker } from "@/components/merchandising/product-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { RowList, Section, inputClass, labelClass } from "@/components/footer/footer-settings-page";

type ProductRef = { id: number; title: string };
type Config = {
  hero: { badge: string; headline: string; highlight: string; headlineSuffix: string; description: string };
  countdown: { enabled: boolean; label: string; endsAt: string; cutoff: string };
  spotlight: ProductRef | null;
  bulk: { enabled: boolean; kicker: string; heading: string; description: string; products: ProductRef[] };
  clearance: { enabled: boolean; kicker: string; heading: string; items: { title: string; description: string }[] };
};

const message = (payload: unknown, fallback: string) => { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; };

// <input type="datetime-local"> works in local time without a zone; the API stores an ISO instant.
const toLocalInput = (iso: string) => { if (!iso) return ""; const date = new Date(iso); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : "");

function Switch({ checked, onChange, label, hint }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint?: ReactNode }) {
  return (
    <label className="flex items-start gap-3">
      <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors ${checked ? "bg-ink" : "bg-border-strong"}`}>
        <span className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
      <span className="text-[13px]"><span className="font-semibold text-ink">{label}</span>{hint ? <span className="mt-0.5 block text-xs text-ink-muted">{hint}</span> : null}</span>
    </label>
  );
}

const asPicked = (ref: ProductRef) => ({ id: ref.id, title: ref.title || `Product #${ref.id}`, slug: "", image: null, price: null });

export function DealsPageSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/settings/deals-page", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(message(payload, "The settings could not be loaded."));
        setConfig((payload.data ?? payload) as Config);
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "The settings could not be loaded."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!config) return <div className="flex min-h-80 items-center justify-center">{error ? <p role="alert" className="flex items-center gap-2 text-sm text-danger-tint-ink"><AlertTriangle className="h-4 w-4" />{error}</p> : <LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" />}</div>;

  const setHero = (patch: Partial<Config["hero"]>) => setConfig({ ...config, hero: { ...config.hero, ...patch } });
  const setCountdown = (patch: Partial<Config["countdown"]>) => setConfig({ ...config, countdown: { ...config.countdown, ...patch } });
  const setBulk = (patch: Partial<Config["bulk"]>) => setConfig({ ...config, bulk: { ...config.bulk, ...patch } });
  const setClearance = (patch: Partial<Config["clearance"]>) => setConfig({ ...config, clearance: { ...config.clearance, ...patch } });
  const { hero, countdown, bulk, clearance } = config;
  const dim = (on: boolean) => (on ? "" : "opacity-50");

  async function save() {
    if (!config) return;
    const trim = <T extends Record<string, unknown>>(value: T): T => Object.fromEntries(Object.entries(value).map(([key, item]) => [key, typeof item === "string" ? item.trim() : item])) as T;
    const clean: Config = {
      hero: trim(config.hero),
      countdown: trim(config.countdown),
      spotlight: config.spotlight,
      bulk: { ...trim(config.bulk), products: config.bulk.products },
      clearance: { ...trim(config.clearance), items: config.clearance.items.map(trim).filter((item) => item.title) },
    };
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/settings/deals-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, "The settings could not be saved."));
      setConfig(clean);
      toast.success("Saved. The deals page updates within about 20 seconds.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The settings could not be saved."); } finally { setSaving(false); }
  }

  return (
    <div className="w-full pb-20">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Deals page</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">Copy and featured products on /deals. The deals themselves are products with a sale price: set or clear it on the product. Changes appear within about 20 seconds of saving.</p>
      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <div className="mt-5 max-w-4xl space-y-5">
        <Section title="Hero" description="The badge, headline and introduction at the top of the page.">
          <div className="space-y-3">
            <label className={labelClass}>Badge<input value={hero.badge} onChange={(event) => setHero({ badge: event.target.value })} maxLength={60} className={inputClass} /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={labelClass}>Headline<input value={hero.headline} onChange={(event) => setHero({ headline: event.target.value })} maxLength={120} className={inputClass} /></label>
              <label className={labelClass}>Highlighted words (orange)<input value={hero.highlight} onChange={(event) => setHero({ highlight: event.target.value })} maxLength={60} className={inputClass} /></label>
              <label className={labelClass}>End of headline<input value={hero.headlineSuffix} onChange={(event) => setHero({ headlineSuffix: event.target.value })} maxLength={80} className={inputClass} /></label>
            </div>
            <p className="rounded-md bg-canvas px-3 py-2 text-xs text-ink-secondary">Use <code>{"{discount}"}</code> in the highlighted words for the biggest current discount. Preview: <strong className="text-ink">{hero.headline}</strong> <strong className="text-accent-strong">{hero.highlight.replace("{discount}", "40")}</strong> <strong className="text-ink">{hero.headlineSuffix}</strong></p>
            <label className={labelClass}>Introduction<textarea value={hero.description} onChange={(event) => setHero({ description: event.target.value })} maxLength={400} rows={3} className={`${inputClass} h-auto resize-y py-2`} /></label>
          </div>
        </Section>

        <Section title="Countdown" description="The timer in the hero.">
          <Switch checked={countdown.enabled} onChange={(enabled) => setCountdown({ enabled })} label="Show the countdown" />
          <div className={`mt-4 space-y-3 ${dim(countdown.enabled)}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Label<input value={countdown.label} onChange={(event) => setCountdown({ label: event.target.value })} maxLength={60} className={inputClass} /></label>
              <label className={labelClass}>Cut-off note<input value={countdown.cutoff} onChange={(event) => setCountdown({ cutoff: event.target.value })} maxLength={80} placeholder="Leave empty to hide" className={inputClass} /></label>
            </div>
            <label className={labelClass}>Campaign ends at (optional)
              <div className="flex gap-2">
                <DatePicker type="datetime-local" aria-label="Campaign end date and time" placeholder="Select date and time" value={toLocalInput(countdown.endsAt)} onChange={(value) => setCountdown({ endsAt: fromLocalInput(value) })} className={`${inputClass} flex-1`} />
                {countdown.endsAt ? <button type="button" onClick={() => setCountdown({ endsAt: "" })} className="mt-1.5 h-10 shrink-0 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary">Clear</button> : null}
              </div>
              <span className="mt-1 block text-xs font-normal text-ink-muted">Empty: the timer resets every night at midnight. Once the end time passes, the countdown is hidden.</span>
            </label>
          </div>
        </Section>

        <Section title="Deal of the day" description="The large featured product under the hero.">
          <p className="mb-3 text-xs text-ink-muted">Leave empty to feature the product with the biggest discount. A pinned product must be on sale to be shown.</p>
          <ProductPicker value={config.spotlight ? asPicked(config.spotlight) : null} onChange={(product) => setConfig({ ...config, spotlight: product ? { id: product.id, title: product.title } : null })} />
        </Section>

        <Section title="Bulk pallets" description="The bulk and job-pack offers section.">
          <Switch checked={bulk.enabled} onChange={(enabled) => setBulk({ enabled })} label="Show this section" />
          <div className={`mt-4 space-y-3 ${dim(bulk.enabled)}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Kicker<input value={bulk.kicker} onChange={(event) => setBulk({ kicker: event.target.value })} maxLength={60} className={inputClass} /></label>
              <label className={labelClass}>Heading<input value={bulk.heading} onChange={(event) => setBulk({ heading: event.target.value })} maxLength={100} className={inputClass} /></label>
            </div>
            <label className={labelClass}>Description<textarea value={bulk.description} onChange={(event) => setBulk({ description: event.target.value })} maxLength={300} rows={2} className={`${inputClass} h-auto resize-y py-2`} /></label>
            <div>
              <p className={labelClass}>Pinned products (up to 6)</p>
              <p className="mt-1 text-xs text-ink-muted">Leave empty to pick automatically: sale products with quantity tiers or pallet, bulk, pack, drum or bundle in the name.</p>
              <ul className="mt-2 space-y-2">
                {bulk.products.map((product) => (
                  <li key={product.id} className="flex items-center gap-3 rounded-lg border border-border bg-canvas p-2.5">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{product.title || `Product #${product.id}`}</span>
                    <button type="button" onClick={() => setBulk({ products: bulk.products.filter((item) => item.id !== product.id) })} aria-label={`Remove ${product.title}`} className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted hover:bg-neutral-tint"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
              {bulk.products.length < 6 ? <div className="mt-2"><ProductPicker key={bulk.products.length} value={null} onChange={(product) => { if (product && !bulk.products.some((item) => item.id === product.id)) setBulk({ products: [...bulk.products, { id: product.id, title: product.title }] }); }} /></div> : null}
            </div>
          </div>
        </Section>

        <Section title="Clearance protection" description="The reassurance block at the bottom of the page.">
          <Switch checked={clearance.enabled} onChange={(enabled) => setClearance({ enabled })} label="Show this section" />
          <div className={`mt-4 space-y-3 ${dim(clearance.enabled)}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Kicker<input value={clearance.kicker} onChange={(event) => setClearance({ kicker: event.target.value })} maxLength={60} className={inputClass} /></label>
              <label className={labelClass}>Heading<input value={clearance.heading} onChange={(event) => setClearance({ heading: event.target.value })} maxLength={100} className={inputClass} /></label>
            </div>
            <RowList
              items={clearance.items}
              onChange={(items) => setClearance({ items })}
              blank={{ title: "", description: "" }}
              addLabel="Add card"
              max={6}
              empty="No cards. The section shows only its heading."
              render={(item, update) => <>
                <label className={labelClass}>Title<input value={item.title} onChange={(event) => update({ title: event.target.value })} maxLength={80} className={inputClass} /></label>
                <label className={labelClass}>Description<input value={item.description} onChange={(event) => update({ description: event.target.value })} maxLength={200} className={inputClass} /></label>
              </>}
            />
          </div>
        </Section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? "Saving…" : "Save changes"}
        </button></div>
      </div>
    </div>
  );
}
