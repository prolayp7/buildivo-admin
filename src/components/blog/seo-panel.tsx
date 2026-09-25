"use client";

import { useState } from "react";
import { ChevronDown, Globe, Monitor, Search, Share2, Smartphone, BookOpenText, Star, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { scoreTone, type Check, type SeoResult, type Status } from "@/components/blog/seo-analysis";

const toneText: Record<Status, string> = { good: "text-positive", ok: "text-highlight-strong", bad: "text-danger" };
const toneBg: Record<Status, string> = { good: "bg-positive", ok: "bg-highlight", bad: "bg-danger" };
const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "text-[13px] font-semibold text-ink-secondary";

export function ScoreRing({ score, size = 56, label }: { score: number; size?: number; label?: string }) {
  const radius = (size - 8) / 2, circumference = 2 * Math.PI * radius;
  const tone = scoreTone(score);
  return (
    <div className="relative shrink-0" style={{ height: size, width: size }} role="img" aria-label={`${label ?? "Score"} ${score} out of 100`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-neutral-tint)" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={6} strokeLinecap="round" className={cn("transition-all", toneText[tone])} stroke="currentColor" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - score / 100)} />
      </svg>
      <span className={cn("absolute inset-0 flex items-center justify-center font-semibold tabular-nums", toneText[tone], size >= 56 ? "text-[15px]" : "text-xs")}>{score}</span>
    </div>
  );
}

function LengthBar({ length, min, max, hardMax }: { length: number; min: number; max: number; hardMax: number }) {
  const tone: Status = length === 0 ? "bad" : length >= min && length <= max ? "good" : length > max && length <= hardMax ? "ok" : length < min && length >= min * 0.6 ? "ok" : "bad";
  return (
    <div className="mt-1.5 flex items-center gap-2.5">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-tint"><div className={cn("h-full rounded-full transition-all", toneBg[tone])} style={{ width: `${Math.min(100, (length / max) * 100)}%` }} /></div>
      <span className={cn("w-16 text-right text-[11px] font-semibold tabular-nums", toneText[tone])}>{length} / {max}</span>
    </div>
  );
}

const cap = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function SerpPreview({ title, description, slug, siteHost, device, pathPrefix, noun }: { title: string; description: string; slug: string; siteHost: string; device: "desktop" | "mobile"; pathPrefix: string; noun: string }) {
  const shownTitle = title.length > 60 ? `${title.slice(0, 58).trim()}…` : title || `${cap(noun)} title`;
  const shownDescription = description.length > 160 ? `${description.slice(0, 158).trim()}…` : description || `Add a meta description to control how this ${noun} appears in search results.`;
  return (
    <div className={cn("rounded-lg border border-border bg-white p-4 shadow-card", device === "mobile" ? "max-w-[380px]" : "max-w-[640px]")}>
      <div className="flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-tint text-ink-muted"><Globe className="h-3.5 w-3.5" /></span>
        <div className="min-w-0 leading-tight"><p className="truncate text-[13px] text-[#202124]">{siteHost}</p><p className="truncate text-[11.5px] text-[#4d5156]">https://{siteHost}{pathPrefix ? ` › ${pathPrefix}` : ""} › {slug || `${noun}-url`}</p></div>
      </div>
      <p className={cn("mt-2 text-[19px] leading-[1.3] text-[#1a0dab]", device === "mobile" ? "line-clamp-2" : "truncate")}>{shownTitle}</p>
      <p className={cn("mt-1 text-[13px] leading-5 text-[#4d5156]", device === "mobile" ? "line-clamp-3" : "line-clamp-2")}>{shownDescription}</p>
    </div>
  );
}

function CheckGroup({ heading, status, checks, defaultOpen }: { heading: string; status: Status; checks: Check[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  if (!checks.length) return null;
  return (
    <div className="border-t border-border first:border-t-0">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2.5 py-3 text-left">
        <span className={cn("h-2.5 w-2.5 rounded-full", toneBg[status])} />
        <span className="flex-1 text-[13px] font-semibold text-ink">{heading} <span className="font-medium text-ink-muted">({checks.length})</span></span>
        <ChevronDown className={cn("h-4 w-4 text-ink-muted transition-transform", open && "rotate-180")} />
      </button>
      {open ? <ul className="space-y-2 pb-3">{checks.map((check) => <li key={check.id} className="flex items-start gap-2.5 text-[13px] leading-5 text-ink-secondary"><span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", toneBg[check.status])} />{check.text}</li>)}</ul> : null}
    </div>
  );
}

function Analysis({ checks, labels }: { checks: Check[]; labels: [string, string, string] }) {
  const bad = checks.filter((c) => c.status === "bad"), ok = checks.filter((c) => c.status === "ok"), good = checks.filter((c) => c.status === "good");
  return (
    <div>
      <CheckGroup heading={labels[0]} status="bad" checks={bad} defaultOpen />
      <CheckGroup heading={labels[1]} status="ok" checks={ok} defaultOpen />
      <CheckGroup heading={labels[2]} status="good" checks={good} />
    </div>
  );
}

function SocialCard({ title, description, siteHost, variant, noun }: { title: string; description: string; siteHost: string; variant: "facebook" | "x"; noun: string }) {
  return (
    <div className={cn("overflow-hidden border border-border bg-white shadow-card", variant === "facebook" ? "rounded-sm" : "rounded-2xl")}>
      <div className="flex h-36 items-center justify-center bg-neutral-tint text-ink-faint"><Share2 className="h-8 w-8" /></div>
      <div className={cn("p-3", variant === "facebook" && "bg-[#f2f3f5]")}>
        <p className="text-[11px] uppercase text-ink-muted">{siteHost}</p>
        <p className="mt-0.5 line-clamp-2 text-[14px] font-semibold text-ink">{title || `${cap(noun)} title`}</p>
        <p className="mt-0.5 line-clamp-2 text-[12.5px] text-ink-muted">{description || `${cap(noun)} description`}</p>
      </div>
    </div>
  );
}

const MAX_KEYWORDS = 5;

function KeywordInput({ keywords, onChange }: { keywords: string[]; onChange: (keywords: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const next = raw.trim().slice(0, 80);
    setDraft("");
    if (!next || keywords.length >= MAX_KEYWORDS || keywords.some((keyword) => keyword.toLowerCase() === next.toLowerCase())) return;
    onChange([...keywords, next]);
  };
  const makePrimary = (index: number) => onChange([keywords[index], ...keywords.filter((_, i) => i !== index)]);
  return (
    <div>
      <div className="mt-2 flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 py-1.5 focus-within:border-accent-strong">
        {keywords.map((keyword, index) => (
          <span key={keyword} className={cn("inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-semibold", index === 0 ? "bg-accent-tint text-accent-tint-ink ring-1 ring-inset ring-accent-tint-border" : "bg-neutral-tint text-ink-secondary")}>
            {index === 0 ? <Star className="h-3 w-3 fill-current" aria-label="Primary keyword" /> : null}
            {keyword}
            {index > 0 ? <button type="button" onClick={() => makePrimary(index)} aria-label={`Make ${keyword} the primary keyword`} title="Make primary" className="rounded-full p-0.5 text-ink-muted hover:bg-surface hover:text-accent"><Star className="h-3 w-3" /></button> : null}
            <button type="button" onClick={() => onChange(keywords.filter((_, i) => i !== index))} aria-label={`Remove ${keyword}`} className="rounded-full p-0.5 text-ink-muted hover:bg-surface hover:text-danger"><X className="h-3 w-3" /></button>
          </span>
        ))}
        {keywords.length < MAX_KEYWORDS ? (
          <input
            value={draft}
            onChange={(event) => { const value = event.target.value; if (value.includes(",")) { value.split(",").forEach(add); } else setDraft(value); }}
            onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(draft); } else if (event.key === "Backspace" && !draft && keywords.length) onChange(keywords.slice(0, -1)); }}
            onBlur={() => add(draft)}
            placeholder={keywords.length ? "Add another keyword…" : "e.g. cordless drill"}
            aria-label="Focus keywords"
            className="h-7 min-w-32 flex-1 bg-transparent px-1 text-[13px] text-ink outline-none! placeholder:text-ink-faint"
          />
        ) : null}
      </div>
      <span className="mt-1.5 block text-[11.5px] font-normal text-ink-muted">Press Enter or comma to add up to {MAX_KEYWORDS} keywords. The first (starred) is the primary keyword and drives the score.</span>
    </div>
  );
}

type Props = {
  results: SeoResult[];
  pathPrefix?: string; noun?: "post" | "page";
  title: string; excerpt: string; slug: string; siteHost: string;
  keywords: string[]; setKeywords: (keywords: string[]) => void;
  metaTitle: string; setMetaTitle: (value: string) => void;
  metaDescription: string; setMetaDescription: (value: string) => void;
};

export function SeoPanel({ results, pathPrefix = "blog", noun = "post", title, excerpt, slug, siteHost, keywords, setKeywords, metaTitle, setMetaTitle, metaDescription, setMetaDescription }: Props) {
  const [tab, setTab] = useState<"seo" | "readability" | "social">("seo");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [activeKeyword, setActiveKeyword] = useState(0);
  const activeIndex = Math.min(activeKeyword, results.length - 1);
  const result = results[0], activeResult = results[activeIndex];
  const seoTitle = metaTitle.trim() || title, seoDescription = metaDescription.trim() || excerpt;
  const tabs = [{ id: "seo", label: "SEO", icon: Search, score: result.seoScore }, { id: "readability", label: "Readability", icon: BookOpenText, score: result.readabilityScore }, { id: "social", label: "Social", icon: Share2, score: null }] as const;

  return (
    <section className="rounded-xl border border-border bg-surface shadow-card">
      <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
        <ScoreRing score={result.seoScore} label="SEO score" />
        <div className="mr-auto"><h2 className="text-sm font-semibold text-ink">Search engine optimisation</h2><p className="text-xs text-ink-muted">Improve how this {noun} ranks and appears in search results.</p></div>
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-border px-3">
        {tabs.map(({ id, label, icon: Icon, score }) => (
          <button key={id} type="button" onClick={() => setTab(id)} className={cn("relative flex shrink-0 items-center gap-2 px-3 py-3 text-[13px] font-semibold", tab === id ? "text-ink after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:bg-ink" : "text-ink-muted hover:text-ink")}>
            <Icon className="h-4 w-4" />{label}
            {score !== null ? <span className={cn("h-2.5 w-2.5 rounded-full", toneBg[scoreTone(score)])} /> : null}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "seo" ? (
          <div className="space-y-6">
            <div><span className={labelClass}>Focus keywords</span><KeywordInput keywords={keywords} onChange={setKeywords} /></div>

            <div>
              <div className="flex items-center justify-between"><p className={labelClass}>Search appearance</p>
                <div className="flex rounded-md border border-border p-0.5">{([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([id, Icon]) => <button key={id} type="button" onClick={() => setDevice(id)} aria-label={`${id} preview`} aria-pressed={device === id} className={cn("flex h-7 w-8 items-center justify-center rounded", device === id ? "bg-ink text-white" : "text-ink-muted hover:text-ink")}><Icon className="h-3.5 w-3.5" /></button>)}</div>
              </div>
              <div className="mt-3"><SerpPreview title={seoTitle} description={seoDescription} slug={slug} siteHost={siteHost} device={device} pathPrefix={pathPrefix} noun={noun} /></div>
            </div>

            <label className={cn(labelClass, "block")}>SEO title<input value={metaTitle} onChange={(event) => setMetaTitle(event.target.value)} placeholder={title || `${cap(noun)} title`} className={inputClass} /><LengthBar length={seoTitle.length} min={30} max={60} hardMax={70} /></label>
            <label className={cn(labelClass, "block")}>Meta description<textarea value={metaDescription} onChange={(event) => setMetaDescription(event.target.value)} rows={3} placeholder={excerpt || "Summarise the post in 120–160 characters."} className={`${inputClass} h-auto resize-y py-3`} /><LengthBar length={seoDescription.length} min={120} max={160} hardMax={200} /></label>

            <div>
              <p className="mb-2 text-[13px] font-semibold text-ink-secondary">Analysis</p>
              {keywords.length > 1 ? (
                <div className="mb-2 flex flex-wrap gap-1.5" role="tablist" aria-label="Keyword analysis">
                  {keywords.map((keyword, index) => (
                    <button key={keyword} type="button" role="tab" aria-selected={index === activeIndex} onClick={() => setActiveKeyword(index)} className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold", index === activeIndex ? "border-ink bg-ink text-white" : "border-border text-ink-secondary hover:bg-canvas")}>
                      <span className={cn("h-2 w-2 rounded-full", toneBg[scoreTone(results[index].seoScore)])} />{keyword}<span className="tabular-nums opacity-70">{results[index].seoScore}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              <Analysis checks={activeResult.seoChecks} labels={["Problems", "Improvements", "Good results"]} />
            </div>
          </div>
        ) : tab === "readability" ? (
          <div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {[["Words", result.wordCount.toLocaleString("en-GB")], ["Reading time", `${result.readingMinutes} min`], ["Flesch ease", result.flesch === null ? "—" : String(result.flesch)]].map(([label, value]) => <div key={label} className="rounded-lg border border-border bg-canvas px-3.5 py-2.5"><p className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{label}</p><p className="mt-0.5 text-lg font-semibold tabular-nums text-ink">{value}</p></div>)}
            </div>
            <Analysis checks={result.readabilityChecks} labels={["Problems", "Improvements", "Good results"]} />
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-ink-muted">Preview of how this {noun} looks when shared. Uses your SEO title and meta description.</p>
            <div className="grid gap-5 md:grid-cols-2">
              <div><p className="mb-2 text-[12px] font-semibold text-ink-secondary">Facebook</p><SocialCard title={seoTitle} description={seoDescription} siteHost={siteHost} variant="facebook" noun={noun} /></div>
              <div><p className="mb-2 text-[12px] font-semibold text-ink-secondary">X (Twitter)</p><SocialCard title={seoTitle} description={seoDescription} siteHost={siteHost} variant="x" noun={noun} /></div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
