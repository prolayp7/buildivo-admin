"use client";

import { useEffect, useId, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

export type GuideStep = { title: string; description: string; imageUrl: string };
export type GuideMaterial = { label: string; quantity: string; productSlug: string };
export type GuideData = { difficulty: string; minutes: string; steps: GuideStep[]; materials: GuideMaterial[] };

export const emptyGuide: GuideData = { difficulty: "", minutes: "", steps: [], materials: [] };

const str = (value: unknown) => (typeof value === "string" ? value : typeof value === "number" ? String(value) : "");
const list = (value: unknown): Record<string, unknown>[] => (Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object") : []);

/** Reads the guide fields off a saved post. */
export function guideFromPost(post: Record<string, unknown>): GuideData {
  return {
    difficulty: str(post.difficulty),
    minutes: str(post.estimatedTimeMinutes),
    steps: list(post.steps).map((step) => ({ title: str(step.title), description: str(step.description), imageUrl: str(step.imageUrl) })),
    materials: list(post.materials).map((item) => ({ label: str(item.label), quantity: str(item.quantity), productSlug: str(item.productSlug) })),
  };
}

/** The API payload for the guide fields. Empty rows are dropped; empty values clear a previously saved field. */
export function guideToPayload(guide: GuideData) {
  const minutes = Number(guide.minutes);
  return {
    difficulty: guide.difficulty || null,
    estimatedTimeMinutes: guide.minutes && Number.isInteger(minutes) && minutes > 0 ? minutes : null,
    steps: guide.steps.filter((step) => step.title.trim()).map((step) => ({ title: step.title.trim(), description: step.description.trim(), ...(step.imageUrl.trim() ? { imageUrl: step.imageUrl.trim() } : {}) })),
    materials: guide.materials.filter((item) => item.label.trim()).map((item) => ({ label: item.label.trim(), ...(item.quantity.trim() ? { quantity: item.quantity.trim() } : {}), ...(item.productSlug.trim() ? { productSlug: item.productSlug.trim() } : {}) })),
  };
}

const inputClass = "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";
const labelClass = "text-[13px] font-semibold text-ink-secondary";
const iconButton = "flex h-8 w-8 items-center justify-center rounded-md border border-border text-ink-muted hover:bg-neutral-tint disabled:opacity-40";

function move<T>(items: T[], index: number, by: -1 | 1): T[] {
  const next = [...items];
  const target = index + by;
  if (target < 0 || target >= next.length) return items;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// Suggests real catalogue products (by slug) as the shopper-facing link for a material.
function ProductSlugInput({ value, onChange }: { value: string; onChange: (slug: string) => void }) {
  const listId = useId();
  const [options, setOptions] = useState<{ slug: string; title: string }[]>([]);
  useEffect(() => {
    if (value.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/products?q=${encodeURIComponent(value.trim())}&perPage=8`, { signal: controller.signal });
        const payload = await response.json();
        const rows = (payload.data ?? payload.items ?? []) as { slug: string; title: string }[];
        setOptions(rows.map((row) => ({ slug: row.slug, title: row.title })));
      } catch { /* suggestions are optional */ }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [value]);
  return (
    <>
      <input list={listId} value={value} onChange={(event) => onChange(event.target.value)} placeholder="Product slug (optional)" aria-label="Linked product slug" className={inputClass} />
      <datalist id={listId}>{options.map((option) => <option key={option.slug} value={option.slug}>{option.title}</option>)}</datalist>
    </>
  );
}

export function GuideFields({ value, onChange }: { value: GuideData; onChange: (next: GuideData) => void }) {
  const set = (patch: Partial<GuideData>) => onChange({ ...value, ...patch });
  const setStep = (index: number, patch: Partial<GuideStep>) => set({ steps: value.steps.map((step, i) => (i === index ? { ...step, ...patch } : step)) });
  const setMaterial = (index: number, patch: Partial<GuideMaterial>) => set({ materials: value.materials.map((item, i) => (i === index ? { ...item, ...patch } : item)) });

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
      <h2 className="text-sm font-semibold text-ink">DIY guide details <span className="font-normal text-ink-muted">(optional)</span></h2>
      <p className="mt-1 text-xs text-ink-muted">Fill these in to publish this post as a step-by-step guide with a materials list. Leave them empty for an ordinary post.</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>Difficulty
          <select value={value.difficulty} onChange={(event) => set({ difficulty: event.target.value })} className={inputClass}>
            <option value="">Not set</option><option value="Beginner">Beginner</option><option value="Intermediate">Intermediate</option><option value="Advanced">Advanced</option>
          </select>
        </label>
        <label className={labelClass}>Time needed (minutes)
          <input type="number" min={1} step={1} value={value.minutes} onChange={(event) => set({ minutes: event.target.value })} placeholder="e.g. 90" className={inputClass} />
        </label>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between"><span className={labelClass}>Steps</span><button type="button" onClick={() => set({ steps: [...value.steps, { title: "", description: "", imageUrl: "" }] })} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Plus className="h-3.5 w-3.5" />Add step</button></div>
        {value.steps.length === 0 ? <p className="mt-2 text-xs text-ink-muted">No steps yet.</p> : null}
        <ol className="mt-2 space-y-3">
          {value.steps.map((step, index) => (
            <li key={index} className="rounded-lg border border-border bg-canvas p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-ink-muted">Step {index + 1}</span>
                <div className="flex gap-1.5">
                  <button type="button" aria-label={`Move step ${index + 1} up`} disabled={index === 0} onClick={() => set({ steps: move(value.steps, index, -1) })} className={iconButton}><ArrowUp className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={`Move step ${index + 1} down`} disabled={index === value.steps.length - 1} onClick={() => set({ steps: move(value.steps, index, 1) })} className={iconButton}><ArrowDown className="h-3.5 w-3.5" /></button>
                  <button type="button" aria-label={`Delete step ${index + 1}`} onClick={() => set({ steps: value.steps.filter((_, i) => i !== index) })} className={iconButton}><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
              <input value={step.title} onChange={(event) => setStep(index, { title: event.target.value })} placeholder="Step title" aria-label={`Step ${index + 1} title`} className={inputClass} />
              <textarea value={step.description} onChange={(event) => setStep(index, { description: event.target.value })} rows={3} placeholder="What to do in this step" aria-label={`Step ${index + 1} description`} className={`${inputClass} h-auto resize-y py-2`} />
              <input value={step.imageUrl} onChange={(event) => setStep(index, { imageUrl: event.target.value })} placeholder="Image URL (optional)" aria-label={`Step ${index + 1} image URL`} className={inputClass} />
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between"><span className={labelClass}>Materials &amp; tools</span><button type="button" onClick={() => set({ materials: [...value.materials, { label: "", quantity: "", productSlug: "" }] })} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint"><Plus className="h-3.5 w-3.5" />Add item</button></div>
        {value.materials.length === 0 ? <p className="mt-2 text-xs text-ink-muted">No materials yet.</p> : null}
        <ul className="mt-2 space-y-3">
          {value.materials.map((item, index) => (
            <li key={index} className="grid gap-2 rounded-lg border border-border bg-canvas p-3 sm:grid-cols-[1fr_120px_1fr_auto] sm:items-start">
              <input value={item.label} onChange={(event) => setMaterial(index, { label: event.target.value })} placeholder="Item, e.g. 18V drill driver" aria-label={`Material ${index + 1} name`} className={inputClass} />
              <input value={item.quantity} onChange={(event) => setMaterial(index, { quantity: event.target.value })} placeholder="Qty" aria-label={`Material ${index + 1} quantity`} className={inputClass} />
              <ProductSlugInput value={item.productSlug} onChange={(slug) => setMaterial(index, { productSlug: slug })} />
              <button type="button" aria-label={`Delete material ${index + 1}`} onClick={() => set({ materials: value.materials.filter((_, i) => i !== index) })} className={`${iconButton} mt-2`}><Trash2 className="h-3.5 w-3.5" /></button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
