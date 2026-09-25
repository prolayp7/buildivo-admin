"use client";

import { useState } from "react";
import { X } from "lucide-react";

// Chip input: Enter or comma commits a tag, Backspace on an empty box removes the last one.
export function TagInput({ tags, onChange, placeholder = "Add a tag…", ariaLabel = "Tags", max = 20 }: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  ariaLabel?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  const commit = (raw: string[]) => {
    const next = [...tags];
    for (const value of raw) {
      const tag = value.trim().slice(0, 50);
      if (tag && next.length < max && !next.some((existing) => existing.toLowerCase() === tag.toLowerCase())) next.push(tag);
    }
    setDraft("");
    if (next.length !== tags.length) onChange(next);
  };

  return (
    <div className="mt-2 flex min-h-10 flex-wrap items-center gap-1.5 rounded-md border border-border-strong bg-surface px-2 py-1.5 focus-within:border-accent-strong">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-neutral-tint py-1 pl-2.5 pr-1.5 text-xs font-semibold text-ink-secondary">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((existing) => existing !== tag))} aria-label={`Remove ${tag}`} className="rounded-full p-0.5 text-ink-muted hover:bg-surface hover:text-danger"><X className="h-3 w-3" /></button>
        </span>
      ))}
      {tags.length < max ? (
        <input
          value={draft}
          onChange={(event) => { const value = event.target.value; if (value.includes(",")) commit(value.split(",")); else setDraft(value); }}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit([draft]); } else if (event.key === "Backspace" && !draft && tags.length) onChange(tags.slice(0, -1)); }}
          onBlur={() => commit([draft])}
          placeholder={tags.length ? "Add another…" : placeholder}
          aria-label={ariaLabel}
          className="h-7 min-w-28 flex-1 bg-transparent px-1 text-[13px] text-ink outline-none! placeholder:text-ink-faint"
        />
      ) : null}
    </div>
  );
}
