"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CircleDashed, LoaderCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/cn";

type Extension = { name: string; state: "enabled" | "installable" | "unavailable"; feature: string; detail: string };
type Tier = { id: string; label: string; description: string; status: "active" | "waiting" | "planned"; prerequisites: { label: string; met: boolean; detail?: string }[] };
type Indexing = { indexed: number; total: number; running: boolean; lastRun: { message: string; at: string } | null };
type Status = { indexing: Indexing; extensions: Extension[]; openai: { configured: boolean; enabled: boolean }; tiers: Tier[] };

// Read-only view of what the store's recommendation and search features are currently able to do.
// `refreshKey` changes whenever credentials are saved, so the card re-checks without a page reload.
export function AiStatusCard({ refreshKey }: { refreshKey: unknown }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState("");
  const [testing, setTesting] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; message: string } | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [indexMessage, setIndexMessage] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/settings/ai", { cache: "no-store" });
        const payload = await response.json();
        if (!response.ok) throw new Error(typeof payload?.message === "string" ? payload.message : "AI status could not be loaded.");
        setStatus(payload.data ?? payload);
        setError("");
      } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "AI status could not be loaded."); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshKey, reload]);

  async function runTest() {
    setTesting(true); setTest(null);
    try {
      const response = await fetch("/api/settings/ai/test", { method: "POST" });
      const payload = await response.json();
      setTest(payload.data ?? { ok: false, message: typeof payload?.message === "string" ? payload.message : "Connection test failed." });
    } catch { setTest({ ok: false, message: "Connection test failed." }); }
    finally { setTesting(false); }
  }

  async function reindex() {
    setIndexing(true); setIndexMessage("");
    try {
      const response = await fetch("/api/settings/ai/reindex", { method: "POST" });
      const payload = await response.json();
      setIndexMessage((payload.data ?? payload)?.message ?? "Indexing could not be started.");
      setReload((value) => value + 1);
    } catch { setIndexMessage("Indexing could not be started."); }
    finally { setIndexing(false); }
  }

  if (error) return <div role="alert" className="rounded-md bg-danger-tint px-4 py-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border">{error}</div>;
  if (!status) return <div className="flex min-h-24 items-center justify-center"><LoaderCircle className="h-5 w-5 animate-spin text-accent" /></div>;

  return <section className="rounded-lg border border-border bg-surface">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
      <div><h2 className="text-[15px] font-semibold text-ink">Recommendations &amp; search</h2><p className="mt-0.5 text-xs text-ink-muted">Each feature switches on by itself once what it needs is available. Nothing here needs a restart.</p></div>
      <button type="button" onClick={runTest} disabled={testing} className="inline-flex h-9 items-center gap-2 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink hover:bg-neutral-tint disabled:opacity-50">{testing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}Test OpenAI connection</button>
    </header>
    {test ? <p role="status" className={cn("px-5 pt-3 text-xs font-medium", test.ok ? "text-success-tint-ink" : "text-danger-tint-ink")}>{test.message}</p> : null}
    <ul className="divide-y divide-border">
      {status.tiers.map((tier) => <li key={tier.id} className="flex gap-3 px-5 py-4">
        {tier.status === "active" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-tint-ink" /> : <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" />}
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">{tier.label}<span className="ml-2 text-[11px] font-medium text-ink-muted">{tier.status === "active" ? "Active" : tier.status === "waiting" ? "Waiting" : "Coming soon"}</span></p>
          <p className="mt-0.5 text-xs text-ink-muted">{tier.description}</p>
          {tier.id === "semantic" ? <div className="mt-2 flex flex-wrap items-center gap-3"><button type="button" onClick={reindex} disabled={indexing} className="inline-flex h-8 items-center gap-2 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink hover:bg-neutral-tint disabled:opacity-50">{indexing ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}Index products now</button>{indexMessage ? <span role="status" className="text-xs text-ink-secondary">{indexMessage}</span> : null}</div> : null}
          {tier.prerequisites.length ? <ul className="mt-2 space-y-1">{tier.prerequisites.map((item) => <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-secondary">{item.met ? <CheckCircle2 className="h-3.5 w-3.5 text-success-tint-ink" /> : <XCircle className="h-3.5 w-3.5 text-ink-faint" />}{item.label}{item.detail ? <span className="text-ink-faint"> — {item.detail}</span> : null}</li>)}</ul> : null}
        </div>
      </li>)}
    </ul>
    <footer className="border-t border-border bg-canvas px-5 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">Database extensions</p>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2">{status.extensions.map((extension) => <li key={extension.name} className="text-xs text-ink-secondary"><span className="font-mono font-semibold text-ink">{extension.name}</span> — {extension.feature}<span className={cn("block", extension.state === "enabled" ? "text-success-tint-ink" : "text-ink-muted")}>{extension.detail}</span></li>)}</ul>
    </footer>
  </section>;
}
