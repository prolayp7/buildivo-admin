export type Status = "good" | "ok" | "bad";
export type Check = { id: string; status: Status; text: string };
export type SeoInput = {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  excerpt: string;
  focusKeyword: string;
  contentHtml: string;
  siteHost: string;
};
export type SeoResult = {
  seoScore: number;
  readabilityScore: number;
  seoChecks: Check[];
  readabilityChecks: Check[];
  wordCount: number;
  readingMinutes: number;
  flesch: number | null;
};

const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const stripTags = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const wordsOf = (text: string) => text.match(/[\p{L}\p{N}'’-]+/gu) ?? [];
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const scoreOf = (checks: Check[]) => (checks.length ? Math.round((checks.reduce((sum, c) => sum + (c.status === "good" ? 1 : c.status === "ok" ? 0.5 : 0), 0) / checks.length) * 100) : 0);

function countPhrase(text: string, phrase: string) {
  if (!phrase) return 0;
  return (text.match(new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`, "giu")) ?? []).length;
}
function syllables(word: string) {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length);
}

export function analyzeSeo(input: SeoInput): SeoResult {
  const keyword = input.focusKeyword.trim().toLowerCase();
  const seoTitle = (input.metaTitle || input.title).trim();
  const seoDescription = (input.metaDescription || input.excerpt).trim();
  const html = input.contentHtml;
  const text = stripTags(html);
  const words = wordsOf(text);
  const wordCount = words.length;

  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => stripTags(m[1])).filter(Boolean);
  const headings = [...html.matchAll(/<h([2-4])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => stripTags(m[2])).filter(Boolean);
  const hrefs = [...html.matchAll(/<a\s[^>]*href="([^"]+)"/gi)].map((m) => m[1]);
  const internalLinks = hrefs.filter((h) => h.startsWith("/") || (input.siteHost && h.includes(input.siteHost))).length;
  const externalLinks = hrefs.length - internalLinks;

  const seo: Check[] = [];
  if (!keyword) {
    seo.push({ id: "keyword-missing", status: "bad", text: "Set a focus keyword to unlock the keyword checks (title, description, URL, content and headings)." });
  } else {
    const titleIndex = seoTitle.toLowerCase().indexOf(keyword);
    seo.push(titleIndex < 0
      ? { id: "kw-title", status: "bad", text: "Focus keyword is missing from the SEO title." }
      : titleIndex <= seoTitle.length / 2
        ? { id: "kw-title", status: "good", text: "Focus keyword appears at the start of the SEO title." }
        : { id: "kw-title", status: "ok", text: "Focus keyword is in the SEO title, but move it closer to the beginning." });
    seo.push(seoDescription.toLowerCase().includes(keyword)
      ? { id: "kw-desc", status: "good", text: "Focus keyword is used in the meta description." }
      : { id: "kw-desc", status: "bad", text: "Add the focus keyword to your meta description." });
    seo.push(input.slug.includes(slugify(keyword))
      ? { id: "kw-url", status: "good", text: "Focus keyword is used in the URL." }
      : { id: "kw-url", status: "bad", text: "Include the focus keyword in the URL." });
    const opening = paragraphs[0] ?? words.slice(0, 100).join(" ");
    seo.push(opening.toLowerCase().includes(keyword)
      ? { id: "kw-intro", status: "good", text: "Focus keyword appears in the first paragraph." }
      : { id: "kw-intro", status: "bad", text: "Use the focus keyword in the first paragraph of the post." });
    const occurrences = countPhrase(text, keyword);
    const density = wordCount ? (occurrences * wordsOf(keyword).length / wordCount) * 100 : 0;
    seo.push(occurrences === 0
      ? { id: "kw-density", status: "bad", text: "Focus keyword was not found in the content." }
      : density >= 0.5 && density <= 2.5
        ? { id: "kw-density", status: "good", text: `Keyword density is ${density.toFixed(1)}% (${occurrences} time${occurrences === 1 ? "" : "s"}) — ideal.` }
        : { id: "kw-density", status: "ok", text: `Keyword density is ${density.toFixed(1)}% (${occurrences}×). Aim for 0.5–2.5%.` });
    seo.push(headings.some((h) => h.toLowerCase().includes(keyword))
      ? { id: "kw-heading", status: "good", text: "Focus keyword is used in a subheading." }
      : { id: "kw-heading", status: "ok", text: "Use the focus keyword in at least one H2 or H3 subheading." });
  }

  const titleLength = seoTitle.length;
  seo.push(titleLength === 0
    ? { id: "title-length", status: "bad", text: "Add an SEO title." }
    : titleLength < 30
      ? { id: "title-length", status: "ok", text: `SEO title is short (${titleLength} characters). Aim for 30–60.` }
      : titleLength <= 60
        ? { id: "title-length", status: "good", text: `SEO title length is good (${titleLength} characters).` }
        : { id: "title-length", status: "bad", text: `SEO title is too long (${titleLength} characters) and will be cut off. Keep it under 60.` });

  const descLength = seoDescription.length;
  seo.push(descLength === 0
    ? { id: "desc-length", status: "bad", text: "Add a meta description." }
    : descLength >= 120 && descLength <= 160
      ? { id: "desc-length", status: "good", text: `Meta description length is good (${descLength} characters).` }
      : descLength < 120
        ? { id: "desc-length", status: descLength < 70 ? "bad" : "ok", text: `Meta description is short (${descLength} characters). Aim for 120–160.` }
        : { id: "desc-length", status: descLength <= 200 ? "ok" : "bad", text: `Meta description is long (${descLength} characters) and may be truncated. Aim for 120–160.` });

  seo.push(wordCount >= 600
    ? { id: "content-length", status: "good", text: `Content is ${wordCount} words — great length for ranking.` }
    : wordCount >= 300
      ? { id: "content-length", status: "ok", text: `Content is ${wordCount} words. Aim for 600 or more.` }
      : { id: "content-length", status: "bad", text: `Content is only ${wordCount} words. Aim for at least 300 (600+ is best).` });

  seo.push(internalLinks > 0
    ? { id: "links-internal", status: "good", text: `${internalLinks} internal link${internalLinks === 1 ? "" : "s"} found.` }
    : { id: "links-internal", status: "ok", text: "Add internal links to other pages or products on your store." });
  seo.push(externalLinks > 0
    ? { id: "links-external", status: "good", text: `${externalLinks} external link${externalLinks === 1 ? "" : "s"} found.` }
    : { id: "links-external", status: "ok", text: "Link out to at least one trustworthy external source." });

  const imageAlts = [...html.matchAll(/<img\s[^>]*>/gi)].map((m) => decode(m[0].match(/alt="([^"]*)"/i)?.[1] ?? "").trim());
  seo.push(imageAlts.length === 0
    ? { id: "images", status: "ok", text: "Add at least one image to make the post more engaging." }
    : imageAlts.some((alt) => !alt)
      ? { id: "images", status: "bad", text: "Some images have no alt text. Describe every image." }
      : keyword && !imageAlts.some((alt) => alt.toLowerCase().includes(keyword))
        ? { id: "images", status: "ok", text: "Use the focus keyword in at least one image alt text." }
        : { id: "images", status: "good", text: `${imageAlts.length} image${imageAlts.length === 1 ? "" : "s"} with alt text.` });

  seo.push(input.slug.length === 0
    ? { id: "url-length", status: "bad", text: "Add a friendly URL." }
    : input.slug.length <= 75
      ? { id: "url-length", status: "good", text: "URL length is good." }
      : { id: "url-length", status: "ok", text: "URL is long. Shorter URLs are easier to read and share." });

  const readability: Check[] = [];
  let flesch: number | null = null;
  if (wordCount < 50) {
    readability.push({ id: "read-short", status: "ok", text: "Write at least 50 words to get a readability analysis." });
  } else {
    const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    const sentenceWords = sentences.map((s) => wordsOf(s).length);
    const syllableCount = words.reduce((sum, w) => sum + syllables(w), 0);
    flesch = Math.round(206.835 - 1.015 * (wordCount / Math.max(1, sentences.length)) - 84.6 * (syllableCount / wordCount));
    readability.push(flesch >= 60
      ? { id: "flesch", status: "good", text: `Flesch reading ease is ${flesch} — easy to read.` }
      : flesch >= 50
        ? { id: "flesch", status: "ok", text: `Flesch reading ease is ${flesch} — fairly difficult. Use shorter words and sentences.` }
        : { id: "flesch", status: "bad", text: `Flesch reading ease is ${flesch} — difficult to read. Simplify the wording.` });

    const longShare = (sentenceWords.filter((n) => n > 20).length / Math.max(1, sentences.length)) * 100;
    readability.push(longShare <= 25
      ? { id: "sentence-length", status: "good", text: `${Math.round(longShare)}% of sentences are over 20 words — good.` }
      : { id: "sentence-length", status: longShare <= 30 ? "ok" : "bad", text: `${Math.round(longShare)}% of sentences are over 20 words. Keep it under 25%.` });

    const longParagraphs = paragraphs.filter((p) => wordsOf(p).length > 150).length;
    readability.push(longParagraphs === 0
      ? { id: "paragraph-length", status: "good", text: "No paragraph is longer than 150 words." }
      : { id: "paragraph-length", status: longParagraphs === 1 ? "ok" : "bad", text: `${longParagraphs} paragraph${longParagraphs === 1 ? " is" : "s are"} over 150 words. Break them up.` });

    const sections = html.split(/<h[2-4][^>]*>[\s\S]*?<\/h[2-4]>/gi).map((part) => wordsOf(stripTags(part)).length);
    const longSections = sections.filter((n) => n > 300).length;
    readability.push(longSections === 0
      ? { id: "subheadings", status: "good", text: "Subheadings break the text into readable sections." }
      : { id: "subheadings", status: "bad", text: `${longSections} section${longSections === 1 ? " has" : "s have"} more than 300 words without a subheading. Add H2/H3 headings.` });

    let run = 1, worstRun = 1;
    for (let i = 1; i < sentences.length; i++) {
      const same = wordsOf(sentences[i])[0]?.toLowerCase() === wordsOf(sentences[i - 1])[0]?.toLowerCase();
      run = same ? run + 1 : 1;
      worstRun = Math.max(worstRun, run);
    }
    readability.push(worstRun >= 3
      ? { id: "sentence-start", status: "bad", text: `${worstRun} consecutive sentences start with the same word. Vary your openings.` }
      : { id: "sentence-start", status: "good", text: "Sentence openings are varied." });
  }

  return {
    seoScore: scoreOf(seo),
    readabilityScore: scoreOf(readability),
    seoChecks: seo,
    readabilityChecks: readability,
    wordCount,
    readingMinutes: Math.max(1, Math.round(wordCount / 220)),
    flesch,
  };
}

export const scoreTone = (score: number): Status => (score >= 80 ? "good" : score >= 50 ? "ok" : "bad");
