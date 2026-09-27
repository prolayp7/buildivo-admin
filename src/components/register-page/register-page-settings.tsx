"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, ExternalLink, LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { IconPicker } from "@/components/ui/icon-picker";
import { RowList, Section, inputClass, labelClass } from "@/components/footer/footer-settings-page";

type TrustItem = { icon: string; kind: "text" | "freeDelivery"; text: string };
type Config = {
  incentive: { enabled: boolean; badge: string; headingLine1: string; highlight: string; headingRest: string; intro: string; noticeTitle: string; noticeText: string; offerEnabled: boolean; offerCode: string; offerText: string; offerAmount: string };
  spotlight: { enabled: boolean; title: string; description: string; status: string };
  trust: { enabled: boolean; items: TrustItem[] };
};

const message = (payload: unknown, fallback: string) => { if (payload && typeof payload === "object" && "message" in payload) { const value = (payload as { message?: unknown }).message; if (typeof value === "string") return value; if (Array.isArray(value) && typeof value[0] === "string") return value[0]; } return fallback; };

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

export function RegisterPageSettings() {
  const [config, setConfig] = useState<Config | null>(null);
  const [error, setError] = useState(""), [saving, setSaving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/settings/register-page", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(message(payload, "The settings could not be loaded."));
        setConfig((payload.data ?? payload) as Config);
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "The settings could not be loaded."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!config) return <div className="flex min-h-80 items-center justify-center">{error ? <p role="alert" className="flex items-center gap-2 text-sm text-danger-tint-ink"><AlertTriangle className="h-4 w-4" />{error}</p> : <LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" />}</div>;

  const setIncentive = (patch: Partial<Config["incentive"]>) => setConfig({ ...config, incentive: { ...config.incentive, ...patch } });
  const setSpotlight = (patch: Partial<Config["spotlight"]>) => setConfig({ ...config, spotlight: { ...config.spotlight, ...patch } });
  const setTrust = (patch: Partial<Config["trust"]>) => setConfig({ ...config, trust: { ...config.trust, ...patch } });
  const { incentive, spotlight, trust } = config;
  const dim = (on: boolean) => (on ? "" : "opacity-50");

  async function save() {
    if (!config) return;
    const clean: Config = {
      incentive: Object.fromEntries(Object.entries(config.incentive).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])) as Config["incentive"],
      spotlight: Object.fromEntries(Object.entries(config.spotlight).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])) as Config["spotlight"],
      trust: { enabled: config.trust.enabled, items: config.trust.items.map((item) => ({ ...item, text: item.text.trim() })).filter((item) => item.kind === "freeDelivery" || item.text) },
    };
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/settings/register-page", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(clean) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(message(payload, "The settings could not be saved."));
      setConfig(clean);
      toast.success("Saved. The account creation page updates within about 20 seconds.");
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "The settings could not be saved."); } finally { setSaving(false); }
  }

  return (
    <div className="w-full pb-20">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">Account creation page</h1>
      <p className="mt-1 text-[13.5px] text-ink-muted">The promotional sections around the sign-up form. Switch a section off to hide it; changes appear on the storefront within about 20 seconds of saving.</p>
      {error ? <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"><AlertTriangle className="h-4 w-4 shrink-0" />{error}</div> : null}

      <div className="mt-5 max-w-4xl space-y-5">
        <Section title="Sign-up incentive" description="The badge, headline, introduction and welcome notice above the form. When off, the page shows a plain “Create your account” heading.">
          <Switch checked={incentive.enabled} onChange={(enabled) => setIncentive({ enabled })} label="Show this section" />
          <div className={`mt-4 space-y-3 ${dim(incentive.enabled)}`}>
            <label className={labelClass}>Badge<input value={incentive.badge} onChange={(event) => setIncentive({ badge: event.target.value })} maxLength={60} placeholder="e.g. NEW ACCOUNT INCENTIVE" className={inputClass} /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className={labelClass}>Headline, first line<input value={incentive.headingLine1} onChange={(event) => setIncentive({ headingLine1: event.target.value })} maxLength={100} className={inputClass} /></label>
              <label className={labelClass}>Highlighted words (orange)<input value={incentive.highlight} onChange={(event) => setIncentive({ highlight: event.target.value })} maxLength={60} className={inputClass} /></label>
              <label className={labelClass}>Rest of the second line<input value={incentive.headingRest} onChange={(event) => setIncentive({ headingRest: event.target.value })} maxLength={100} className={inputClass} /></label>
            </div>
            <p className="rounded-md bg-canvas px-3 py-2 text-xs text-ink-secondary">Preview: <strong className="text-ink">{incentive.headingLine1}</strong> <strong className="text-accent-strong">{incentive.highlight}</strong> <strong className="text-ink">{incentive.headingRest}</strong></p>
            <label className={labelClass}>Introduction<textarea value={incentive.intro} onChange={(event) => setIncentive({ intro: event.target.value })} maxLength={400} rows={3} className={`${inputClass} h-auto resize-y py-2`} /></label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Notice title<input value={incentive.noticeTitle} onChange={(event) => setIncentive({ noticeTitle: event.target.value })} maxLength={80} className={inputClass} /></label>
              <label className={labelClass}>Notice text<input value={incentive.noticeText} onChange={(event) => setIncentive({ noticeText: event.target.value })} maxLength={200} className={inputClass} /></label>
            </div>
            <div className="rounded-lg border border-border bg-canvas p-3">
              <Switch checked={incentive.offerEnabled} onChange={(offerEnabled) => setIncentive({ offerEnabled })} label="Show the welcome offer box above the sign-up button" hint={<>Only promise what you offer: create a matching coupon under <Link href="/promotions" className="font-semibold underline underline-offset-2">Discounts<ExternalLink className="ml-0.5 inline h-3 w-3" /></Link>, and make sure the code here is the one customers can use at checkout.</>} />
              <div className={`mt-3 grid gap-3 sm:grid-cols-[1fr_2fr_120px] ${dim(incentive.offerEnabled)}`}>
                <label className={labelClass}>Coupon code<input value={incentive.offerCode} onChange={(event) => setIncentive({ offerCode: event.target.value })} maxLength={40} className={inputClass} /></label>
                <label className={labelClass}>Description<input value={incentive.offerText} onChange={(event) => setIncentive({ offerText: event.target.value })} maxLength={160} className={inputClass} /></label>
                <label className={labelClass}>Amount label<input value={incentive.offerAmount} onChange={(event) => setIncentive({ offerAmount: event.target.value })} maxLength={20} placeholder="−15%" className={inputClass} /></label>
              </div>
            </div>
          </div>
        </Section>

        <Section title="Trending card" description="The dark card at the top of the right-hand column, and the product picks under it. When off, the whole trending column is hidden.">
          <Switch checked={spotlight.enabled} onChange={(enabled) => setSpotlight({ enabled })} label="Show this section" hint="The products come from your Power Tools catalogue automatically." />
          <div className={`mt-4 space-y-3 ${dim(spotlight.enabled)}`}>
            <label className={labelClass}>Title<input value={spotlight.title} onChange={(event) => setSpotlight({ title: event.target.value })} maxLength={80} className={inputClass} /></label>
            <label className={labelClass}>Description<input value={spotlight.description} onChange={(event) => setSpotlight({ description: event.target.value })} maxLength={200} className={inputClass} /></label>
            <label className={labelClass}>Status line (optional)<input value={spotlight.status} onChange={(event) => setSpotlight({ status: event.target.value })} maxLength={60} placeholder="Leave empty to hide" className={inputClass} /></label>
          </div>
        </Section>

        <Section title="Trust list" description="The short list of reassurances under the trending products (e.g. warranties, returns).">
          <Switch checked={trust.enabled} onChange={(enabled) => setTrust({ enabled })} label="Show this section" />
          <div className={`mt-4 ${dim(trust.enabled)}`}>
            <RowList items={trust.items} onChange={(items) => setTrust({ items })} max={8} addLabel="Add item" empty="No items. The list is hidden." blank={{ icon: "verified", kind: "text" as const, text: "" }}
              render={(item, update) => (<>
                <div><span className={labelClass}>Icon</span><IconPicker value={item.icon} onChange={(icon) => update({ icon })} /></div>
                <label className={labelClass}>Type<select value={item.kind} onChange={(event) => update({ kind: event.target.value as TrustItem["kind"] })} className={inputClass}><option value="text">Custom text</option><option value="freeDelivery">Free-delivery message</option></select></label>
                {item.kind === "text"
                  ? <label className={labelClass}>Text<input value={item.text} onChange={(event) => update({ text: event.target.value })} maxLength={120} placeholder="e.g. 30-Day Hassle-Free Returns" className={inputClass} /></label>
                  : <p className="pt-6 text-xs text-ink-muted">Shows “Free delivery over …” using the threshold from <Link href="/shipping" className="font-semibold underline underline-offset-2">Shipping</Link>. Hidden if no method offers free delivery.</p>}
              </>)} />
          </div>
        </Section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-end"><button type="button" onClick={() => void save()} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save changes</button></div>
      </div>
    </div>
  );
}
