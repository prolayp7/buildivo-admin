import { newBlock, youTubeId, type ContentBlock, type TextBlock } from "@/components/blog/blog-content-blocks";

const str = (value: unknown) => (typeof value === "string" ? value : "");
const hasText = (html: string) => html.replace(/<[^>]*>/g, " ").trim().length > 0;

// Page.contentBlocks is a JSON array. Text sections keep the original `{ heading?, body }` shape
// (so existing pages and any renderer that only knows sections still work); image and video
// blocks are additional `type` entries. A legacy plain string becomes one text section.
export function pageBlocksFromJson(raw: unknown): ContentBlock[] {
  let blocks: ContentBlock[] = [];
  if (typeof raw === "string") {
    if (raw.trim()) blocks = [{ ...(newBlock("text") as TextBlock), html: raw.split("\n\n").map((paragraph) => `<p>${paragraph}</p>`).join("") }];
  } else if (Array.isArray(raw)) {
    blocks = raw.flatMap((entry): ContentBlock[] => {
      const item = (entry && typeof entry === "object" ? entry : {}) as Record<string, unknown>;
      const id = typeof item.id === "string" ? item.id : crypto.randomUUID();
      if (item.type === "image") return [{ id, type: "image", url: str(item.url), alt: str(item.alt), caption: str(item.caption) }];
      if (item.type === "video") return [{ id, type: "video", url: str(item.url), caption: str(item.caption) }];
      return [{ id, type: "text", heading: str(item.heading), html: str(item.body) || str(item.html) }];
    });
  }
  return blocks.length ? blocks : [newBlock("text")];
}

export function pageBlocksToJson(blocks: ContentBlock[]): Record<string, unknown>[] {
  return blocks.flatMap((block): Record<string, unknown>[] => {
    if (block.type === "text") return block.heading?.trim() || hasText(block.html) ? [{ id: block.id, type: "text", heading: block.heading?.trim() || undefined, body: block.html }] : [];
    if (block.type === "image") return block.url ? [{ id: block.id, type: "image", url: block.url, alt: block.alt.trim(), caption: block.caption.trim() }] : [];
    return youTubeId(block.url) ? [{ id: block.id, type: "video", url: block.url.trim(), caption: block.caption.trim() }] : [];
  });
}
