"use client";
/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { collectionFromApi } from "@/lib/api-response";
import { mediaFileUrl } from "@/lib/media";

export interface ProjectKit {
  id: string;
  name: string;
  description: string;
  specLabel: string;
  specValue: string;
  est: string;
  itemCount: string;
  image: string;
  imageAlt: string;
  active: boolean;
}

type ProjectKitsConfig = {
  badgeLabel: string;
  heading: string;
  description: string;
  footnote: string;
  kits: ProjectKit[];
  [key: string]: unknown;
};
type Section = { id: number; type: string; config: Record<string, unknown> };

const LEGACY_KITS = [
  [
    "Decking & Outdoor Framing",
    "C24 treated joists, deck boards, weed membrane, joist tape & coach screws.",
    "Estimated Area",
    "25 - 35 m²",
    "£1,420.00",
    "24",
    "/images/projects/decking.jpg",
  ],
  [
    "Complete Bathroom Refit",
    "Tanking kit, 15mm/22mm copper, JG Speedfit manifolds, tile backer boards.",
    "Typical Room Size",
    "Standard 3-piece",
    "£2,180.00",
    "48",
    "/images/projects/bathroom.jpg",
  ],
  [
    "Jobsite Electrical Rough-In",
    "100m drums 2.5mm² T&E, 1.5mm² lighting, dry lining boxes, RCBOs.",
    "Scope",
    "4-Zone Extension",
    "£895.00",
    "32",
    "/images/projects/electrical.jpg",
  ],
  [
    "Workshop Storage Build",
    "Birch plywood sheets, heavy duty steel angle brackets, heavy-duty castors.",
    "Bench Spec",
    "2.4m Heavy Workbench",
    "£640.00",
    "18",
    "/images/projects/workshop.jpg",
  ],
] as const;

const DEFAULTS: ProjectKitsConfig = {
  badgeLabel: "Turnkey Project Packs",
  heading: "Shop by Complete Job",
  description:
    "Standardized bills of materials curated with vetted tradespeople. Eliminate missed fixings, incorrect gauge wiring, and return trips.",
  footnote: "All bundles include 5% bulk rebate",
  kits: [],
};
const inputClass =
  "mt-2 h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-[13px] font-normal text-ink outline-none placeholder:text-ink-faint focus:border-accent-strong";

function apiMessage(payload: unknown, fallback: string) {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof (payload as { message?: unknown }).message === "string"
  )
    return (payload as { message: string }).message;
  return fallback;
}
function legacyKits(config: Record<string, unknown>): ProjectKit[] {
  return LEGACY_KITS.map((kit, index) => ({
    id: `legacy-${index + 1}`,
    name: String(config[`kit${index + 1}Name`] ?? kit[0]),
    description: String(config[`kit${index + 1}Description`] ?? kit[1]),
    specLabel: String(config[`kit${index + 1}SpecLabel`] ?? kit[2]),
    specValue: String(config[`kit${index + 1}SpecValue`] ?? kit[3]),
    est: String(config[`kit${index + 1}Est`] ?? kit[4]),
    itemCount: String(config[`kit${index + 1}ItemCount`] ?? kit[5]),
    image: kit[6],
    imageAlt: kit[0],
    active: true,
  }));
}
function normalizeKits(config: Partial<ProjectKitsConfig>): ProjectKit[] {
  return Array.isArray(config.kits) && config.kits.length
    ? config.kits.map((kit, index) => ({
        ...kit,
        id: kit.id || `kit-${index + 1}`,
        active: kit.active !== false,
      }))
    : legacyKits(config as Record<string, unknown>);
}
function imageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("The image could not be read."));
    };
    image.src = url;
  });
}

export function ProjectKitsPage() {
  const [sectionId, setSectionId] = useState<number | null>(null);
  const [config, setConfig] = useState<ProjectKitsConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true),
    [saving, setSaving] = useState(false),
    [uploading, setUploading] = useState<string | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/homepage-sections", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          apiMessage(payload, "Homepage sections could not be loaded."),
        );
      const section = collectionFromApi<Section>(payload).find(
        (item) => item.type === "PROJECT_KITS",
      );
      if (!section)
        throw new Error("The Project Kits homepage section is not configured.");
      setSectionId(section.id);
      setConfig({
        ...DEFAULTS,
        ...section.config,
        kits: normalizeKits(section.config as Partial<ProjectKitsConfig>),
      });
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Homepage sections could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  function updateKit(id: string, patch: Partial<ProjectKit>) {
    setConfig((current) => ({
      ...current,
      kits: current.kits.map((kit) =>
        kit.id === id ? { ...kit, ...patch } : kit,
      ),
    }));
  }
  function addKit() {
    setConfig((current) => ({
      ...current,
      kits: [
        ...current.kits,
        {
          id: `kit-${Date.now()}`,
          name: "New project kit",
          description: "",
          specLabel: "Project scope",
          specValue: "",
          est: "",
          itemCount: "",
          image: "",
          imageAlt: "",
          active: true,
        },
      ],
    }));
  }
  function removeKit(id: string) {
    setConfig((current) => ({
      ...current,
      kits: current.kits.filter((kit) => kit.id !== id),
    }));
  }

  async function uploadImage(
    event: ChangeEvent<HTMLInputElement>,
    kit: ProjectKit,
  ) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Kit images must be JPG, PNG or WebP files.");
      return;
    }
    if (file.size > 1024 * 1024) {
      setError("Kit images must be 1 MB or smaller.");
      return;
    }
    const dimensions = await imageDimensions(file).catch(() => null);
    if (!dimensions || dimensions.width !== 512 || dimensions.height !== 279) {
      setError("Kit images must be exactly 512 × 279 pixels.");
      return;
    }
    setUploading(kit.id);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("ownerType", "LIBRARY");
      body.set("ownerId", "0");
      body.set("collection", "project-kits");
      body.set("altText", kit.imageAlt.trim() || kit.name);
      const response = await fetch("/api/media", { method: "POST", body });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          apiMessage(payload, "The kit image could not be uploaded."),
        );
      updateKit(kit.id, {
        image: ((payload.data ?? payload) as { url: string }).url,
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "The kit image could not be uploaded.",
      );
    } finally {
      setUploading(null);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sectionId === null) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/homepage-sections/${sectionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          apiMessage(payload, "Project kits content could not be saved."),
        );
      setNotice("Project kits saved.");
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Project kits content could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  function text(
    key: "badgeLabel" | "heading" | "description" | "footnote",
    label: string,
    multiline = false,
  ) {
    return (
      <label className="block text-[13px] font-semibold text-ink-secondary">
        {label}
        {multiline ? (
          <textarea
            value={String(config[key])}
            onChange={(event) =>
              setConfig({ ...config, [key]: event.target.value })
            }
            rows={3}
            className={`${inputClass} h-auto resize-y py-2`}
          />
        ) : (
          <input
            value={String(config[key])}
            onChange={(event) =>
              setConfig({ ...config, [key]: event.target.value })
            }
            className={inputClass}
          />
        )}
      </label>
    );
  }

  if (loading)
    return (
      <div className="flex min-h-80 items-center justify-center">
        <LoaderCircle className="h-6 w-6 animate-spin text-ink-muted" />
      </div>
    );
  return (
    <form onSubmit={(event) => void submit(event)} className="w-full pb-20">
      <div className="flex items-center gap-2 text-xs text-ink-muted">
        <Link
          href="/homepage"
          className="inline-flex items-center gap-1 hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Homepage
        </Link>
        <span>/</span>
        <span>Project kits</span>
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-ink">
            Project kits
          </h1>
          <p className="mt-1 text-[13.5px] text-ink-muted">
            Manage the complete-job cards shown in the storefront homepage
            section.
          </p>
        </div>
        <button
          type="submit"
          disabled={saving || Boolean(uploading) || sectionId === null}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Save changes
        </button>
      </div>
      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-md bg-danger-tint p-3 text-xs text-danger-tint-ink ring-1 ring-inset ring-danger-tint-border"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
      {notice ? (
        <div
          role="status"
          className="mt-4 rounded-md bg-positive-tint p-3 text-xs font-semibold text-positive"
        >
          {notice}
        </div>
      ) : null}
      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <h2 className="text-sm font-semibold text-ink">Section content</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {text("badgeLabel", "Badge label")}
              {text("heading", "Heading")}
              {text("description", "Description", true)}
              {text("footnote", "Footnote")}
            </div>
          </section>
          <section className="rounded-xl border border-border bg-surface p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-ink">Kit listings</h2>
                <p className="mt-1 text-xs text-ink-muted">
                  Inactive kits remain saved here and are hidden from the
                  storefront. Banner images must be exactly 512 × 279 px and no
                  larger than 1 MB.
                </p>
              </div>
              <button
                type="button"
                onClick={addKit}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-3 text-xs font-semibold text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Add kit
              </button>
            </div>
            <div className="mt-4 space-y-4">
              {config.kits.map((kit, index) => (
                <article
                  id={`kit-${kit.id}`}
                  key={kit.id}
                  className="scroll-mt-5 rounded-lg border border-border bg-canvas p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-ink">
                        Kit {index + 1}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-muted">
                        {kit.active
                          ? "Shown on the storefront"
                          : "Hidden from the storefront"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-semibold text-ink-secondary">
                        <input
                          type="checkbox"
                          checked={kit.active}
                          onChange={(event) =>
                            updateKit(kit.id, { active: event.target.checked })
                          }
                        />
                        Active
                      </label>
                      <button
                        type="button"
                        onClick={() => removeKit(kit.id)}
                        aria-label={`Remove kit ${index + 1}`}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-danger hover:bg-danger-tint"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block text-[13px] font-semibold text-ink-secondary">
                      Name
                      <input
                        required
                        value={kit.name}
                        onChange={(event) =>
                          updateKit(kit.id, { name: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-[13px] font-semibold text-ink-secondary">
                      Item count
                      <input
                        value={kit.itemCount}
                        onChange={(event) =>
                          updateKit(kit.id, { itemCount: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-[13px] font-semibold text-ink-secondary md:col-span-2">
                      Description
                      <textarea
                        value={kit.description}
                        onChange={(event) =>
                          updateKit(kit.id, { description: event.target.value })
                        }
                        rows={2}
                        className={`${inputClass} h-auto resize-y py-2`}
                      />
                    </label>
                    <label className="block text-[13px] font-semibold text-ink-secondary">
                      Stat label
                      <input
                        value={kit.specLabel}
                        onChange={(event) =>
                          updateKit(kit.id, { specLabel: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-[13px] font-semibold text-ink-secondary">
                      Stat value
                      <input
                        value={kit.specValue}
                        onChange={(event) =>
                          updateKit(kit.id, { specValue: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-[13px] font-semibold text-ink-secondary">
                      Est. materials total
                      <input
                        value={kit.est}
                        onChange={(event) =>
                          updateKit(kit.id, { est: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                    <label className="block text-[13px] font-semibold text-ink-secondary">
                      Image ALT text
                      <input
                        value={kit.imageAlt}
                        onChange={(event) =>
                          updateKit(kit.id, { imageAlt: event.target.value })
                        }
                        className={inputClass}
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                    <div className="flex h-20 w-32 items-center justify-center overflow-hidden rounded-md border border-border bg-surface">
                      {kit.image ? (
                        <img
                          src={
                            kit.image.startsWith("/uploads/")
                              ? mediaFileUrl(kit.image)
                              : kit.image
                          }
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-ink-faint" />
                      )}
                    </div>
                    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border-strong px-3 text-xs font-semibold text-ink-secondary hover:bg-neutral-tint">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) => void uploadImage(event, kit)}
                        className="sr-only"
                      />
                      {uploading === kit.id ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      {kit.image ? "Replace banner" : "Upload banner"}
                    </label>
                    <span className="text-[11px] text-ink-muted">
                      512 × 279 px · JPG, PNG or WebP · max 1 MB.
                    </span>
                  </div>
                </article>
              ))}
              {!config.kits.length ? (
                <div className="rounded-lg border border-dashed border-border-strong p-8 text-center text-xs text-ink-muted">
                  No project kits yet. Add a kit to start building this section.
                </div>
              ) : null}
            </div>
          </section>
        </div>
        <aside className="h-fit xl:sticky xl:top-5 rounded-xl border border-border bg-surface p-4 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">
                Kit quick access
              </h2>
              <p className="mt-1 text-xs leading-5 text-ink-muted">
                Jump to a kit listing to edit its details.
              </p>
            </div>
            <span className="rounded-full bg-neutral-tint px-2 py-1 text-[11px] font-semibold text-ink-secondary">
              {config.kits.length}
            </span>
          </div>
          <nav className="mt-4 space-y-1.5" aria-label="Project kit listings">
            {config.kits.map((kit, index) => (
              <a
                key={kit.id}
                href={`#kit-${kit.id}`}
                className="flex items-center gap-2.5 rounded-md border border-transparent p-2 text-left hover:border-border hover:bg-canvas"
              >
                <div className="flex h-9 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-canvas">
                  {kit.image ? (
                    <img
                      src={
                        kit.image.startsWith("/uploads/")
                          ? mediaFileUrl(kit.image)
                          : kit.image
                      }
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-ink-faint" />
                  )}
                </div>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-ink">
                    {kit.name || `Kit ${index + 1}`}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-ink-muted">
                    {kit.active ? "Active" : "Inactive"}
                    {kit.itemCount ? ` · ${kit.itemCount} items` : ""}
                  </span>
                </span>
              </a>
            ))}
          </nav>
          {!config.kits.length ? (
            <p className="mt-4 text-xs text-ink-muted">
              Add a kit to see it here.
            </p>
          ) : null}
        </aside>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-between">
          <Link
            href="/homepage"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3.5 text-[13px] font-semibold text-ink-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>
          <button
            type="submit"
            disabled={saving || Boolean(uploading) || sectionId === null}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-ink px-4 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>
    </form>
  );
}
