import crypto from "crypto";
import type { Application, Response } from "express";
import { db } from "./db";
import { audit } from "./audit";
import { requireRole } from "./auth";

/**
 * Medical literature pipeline. Candidate papers are pulled from PubMed (NCBI E-utilities), filtered to
 * higher-quality publication types, and held in a review queue. Nothing reaches the public Medical Library until
 * an admin approves it, and approved papers are re-checked for retraction.
 */

db.exec(`
CREATE TABLE IF NOT EXISTS literature (
  id TEXT PRIMARY KEY, pmid TEXT NOT NULL UNIQUE, title TEXT NOT NULL, authors TEXT NOT NULL, journal TEXT NOT NULL,
  pub_date TEXT NOT NULL, year INTEGER, doi TEXT, abstract TEXT NOT NULL, pub_types TEXT NOT NULL, condition_term TEXT NOT NULL,
  category TEXT, status TEXT NOT NULL DEFAULT 'candidate', admin_note TEXT, reviewed_by TEXT, reviewed_at TEXT,
  retraction_checked_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_literature_status ON literature(status);
`);
try { db.exec("ALTER TABLE literature ADD COLUMN takeaway TEXT"); } catch { /* column already exists */ }

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const iso = () => new Date().toISOString();
const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const fail = (res: Response, code: number, message: string) => res.status(code).json({ status: "error", message });
const rows = (sql: string, ...p: any[]) => db.prepare(sql).all(...p) as any[];
const row = (sql: string, ...p: any[]) => db.prepare(sql).get(...p) as any;

/** Publication types accepted as candidates (PubMed [pt] values). */
const ACCEPTED_TYPES = ["Systematic Review", "Meta-Analysis", "Randomized Controlled Trial", "Practice Guideline", "Guideline", "Review"];

const decode = (s: string) =>
  s.replace(/<[^>]+>/g, "").replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(d+);/g, (_, d) => String.fromCodePoint(Number(d))).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const tag = (xml: string, name: string) => decode(xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`))?.[1] ?? "");

export interface ParsedPaper {
  pmid: string; title: string; authors: string; journal: string; pubDate: string; year: number | null;
  doi: string | null; abstract: string; pubTypes: string[]; retracted: boolean;
}

export function parsePubmedXml(xml: string): ParsedPaper[] {
  const out: ParsedPaper[] = [];
  for (const block of xml.match(/<PubmedArticle>[\s\S]*?<\/PubmedArticle>/g) ?? []) {
    const pmid = tag(block.match(/<MedlineCitation[\s\S]*?<\/PMID>/)?.[0] ?? "", "PMID");
    const title = tag(block, "ArticleTitle");
    const abstractParts = [...block.matchAll(/<AbstractText([^>]*)>([\s\S]*?)<\/AbstractText>/g)].map(m => {
      const label = m[1].match(/Label="([^"]+)"/)?.[1];
      const text = decode(m[2]);
      return label ? `${label[0]}${label.slice(1).toLowerCase()}: ${text}` : text;
    });
    const authorList = [...block.matchAll(/<Author\s[^>]*>([\s\S]*?)<\/Author>/g)].map(m => {
      const last = tag(m[1], "LastName"), init = tag(m[1], "Initials");
      return last ? `${last}${init ? " " + init : ""}` : tag(m[1], "CollectiveName");
    }).filter(Boolean);
    const authors = authorList.length > 3 ? `${authorList.slice(0, 3).join(", ")}, et al.` : authorList.join(", ");
    const journal = tag(block, "Title") || tag(block, "ISOAbbreviation");
    const year = Number(tag(block.match(/<JournalIssue[\s\S]*?<\/JournalIssue>/)?.[0] ?? "", "Year") || tag(block, "MedlineDate").slice(0, 4)) || null;
    const month = tag(block.match(/<JournalIssue[\s\S]*?<\/JournalIssue>/)?.[0] ?? "", "Month");
    const doi = block.match(/<ArticleId IdType="doi">([^<]+)<\/ArticleId>/)?.[1]?.trim() ?? null;
    const pubTypes = [...block.matchAll(/<PublicationType[^>]*>([^<]+)<\/PublicationType>/g)].map(m => decode(m[1]));
    const retracted = pubTypes.includes("Retracted Publication") || /RefType="RetractionIn"/.test(block);
    if (!pmid || !title || abstractParts.length === 0) continue;
    out.push({ pmid, title, authors: authors || "Authors not listed", journal: journal || "Journal not listed", pubDate: [month, year].filter(Boolean).join(" "), year, doi, abstract: abstractParts.join("\n\n"), pubTypes, retracted });
  }
  return out;
}

const apiQuery = () => `tool=careverified&email=${encodeURIComponent(process.env.ADMIN_EMAIL || "admin@careverified.local")}${process.env.NCBI_API_KEY ? `&api_key=${process.env.NCBI_API_KEY}` : ""}`;

async function fetchJson(url: string) {
  const r = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!r.ok) throw new Error(`PubMed responded ${r.status}`);
  return r.json() as Promise<any>;
}
async function fetchPapers(pmids: string[]): Promise<ParsedPaper[]> {
  if (!pmids.length) return [];
  const r = await fetch(`${EUTILS}/efetch.fcgi?db=pubmed&retmode=xml&id=${pmids.join(",")}&${apiQuery()}`, { signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`PubMed responded ${r.status}`);
  return parsePubmedXml(await r.text());
}

export function searchTerm(condition: string, years: number) {
  const types = ACCEPTED_TYPES.map(t => `"${t}"[pt]`).join(" OR ");
  return `(${condition}[Title/Abstract]) AND (${types}) AND hasabstract AND english[la] AND humans[mh] AND ("last ${years} years"[dp]) NOT "Retracted Publication"[pt]`;
}

/** Evidence label shown to readers, derived from PubMed publication types (strongest first). */
export function evidenceOf(pubTypes: string[]): { label: string; level: "high" | "moderate" | "info" } {
  if (pubTypes.includes("Meta-Analysis")) return { label: "Meta-analysis", level: "high" };
  if (pubTypes.includes("Systematic Review")) return { label: "Systematic review", level: "high" };
  if (pubTypes.includes("Practice Guideline") || pubTypes.includes("Guideline")) return { label: "Clinical guideline", level: "high" };
  if (pubTypes.includes("Randomized Controlled Trial")) return { label: "Randomized trial", level: "moderate" };
  return { label: "Narrative review", level: "info" };
}

const view = (r: any) => ({
  id: r.id, pmid: r.pmid, title: r.title, authors: r.authors, journal: r.journal, pubDate: r.pub_date, year: r.year, doi: r.doi,
  abstract: r.abstract, pubTypes: JSON.parse(r.pub_types), condition: r.condition_term, category: r.category, status: r.status,
  takeaway: r.takeaway ?? null, evidence: evidenceOf(JSON.parse(r.pub_types)), adminNote: r.admin_note, reviewedAt: r.reviewed_at, retractionCheckedAt: r.retraction_checked_at, createdAt: r.created_at,
  url: `https://pubmed.ncbi.nlm.nih.gov/${r.pmid}/`,
});

/** Approved papers in the shape of a Medical Library article. */
export function approvedLiteratureArticles() {
  return rows("SELECT * FROM literature WHERE status = 'approved' ORDER BY reviewed_at DESC").map(r => {
    const v = view(r);
    const cite = `${v.authors} ${v.title} ${v.journal}. ${v.pubDate}.${v.doi ? ` doi:${v.doi}.` : ""} PMID ${v.pmid}.`;
    return {
      id: `lit-${v.pmid}`, title: v.title,
      excerpt: v.abstract.replace(/\s+/g, " ").slice(0, 240).replace(/\s\S*$/, "") + "…",
      content: `${v.abstract}\n\nThis is the abstract of a published paper, not medical advice. Read the full paper at the source and talk to a clinician about your own situation.`,
      category: v.category || v.condition,
      authorId: "pubmed", authorName: v.authors, authorTitle: `${v.journal}${v.year ? ` · ${v.year}` : ""}`, authorAvatar: "",
      authorCredentialsVerified: false,
      takeaway: v.takeaway, evidence: v.evidence,
      date: v.pubDate || String(v.year ?? ""), citations: [cite], faq: [],
      source: { type: "pubmed" as const, pmid: v.pmid, doi: v.doi, journal: v.journal, url: v.url, pubTypes: v.pubTypes, approvedAt: v.reviewedAt, retractionCheckedAt: v.retractionCheckedAt },
    };
  });
}

export function registerLiteratureRoutes(app: Application) {
  const admin = requireRole("admin");

  app.get("/api/admin/literature", admin, (req, res) => {
    const status = str(req.query.status, 20);
    const list = status ? rows("SELECT * FROM literature WHERE status = ? ORDER BY created_at DESC", status) : rows("SELECT * FROM literature ORDER BY created_at DESC");
    const counts = Object.fromEntries(rows("SELECT status, COUNT(*) n FROM literature GROUP BY status").map(r => [r.status, r.n]));
    res.json({ status: "success", data: { items: list.map(view), counts } });
  });

  app.post("/api/admin/literature/search", admin, async (req, res) => {
    const condition = str(req.body?.condition, 80);
    if (condition.length < 3 || /[\[\]"()]/.test(condition)) return fail(res, 400, "Enter a condition name (3 to 80 characters, no brackets or quotes).");
    const years = Math.min(10, Math.max(1, Number(req.body?.years) || 5));
    const max = Math.min(25, Math.max(1, Number(req.body?.max) || 10));
    try {
      const s = await fetchJson(`${EUTILS}/esearch.fcgi?db=pubmed&retmode=json&sort=relevance&retmax=${max}&term=${encodeURIComponent(searchTerm(condition, years))}&${apiQuery()}`);
      const ids: string[] = s?.esearchresult?.idlist ?? [];
      const fresh = ids.filter(id => !row("SELECT 1 FROM literature WHERE pmid = ?", id));
      const papers = (await fetchPapers(fresh)).filter(p => !p.retracted);
      const ins = db.prepare(`INSERT OR IGNORE INTO literature (id, pmid, title, authors, journal, pub_date, year, doi, abstract, pub_types, condition_term, status, retraction_checked_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)`);
      for (const p of papers) ins.run(`lit-${crypto.randomBytes(5).toString("hex")}`, p.pmid, p.title, p.authors, p.journal, p.pubDate, p.year, p.doi, p.abstract, JSON.stringify(p.pubTypes), condition, iso(), iso());
      audit(req, "literature.search", { details: { condition, found: ids.length, added: papers.length } });
      res.json({ status: "success", data: { found: ids.length, added: papers.length, alreadyKnown: ids.length - fresh.length } });
    } catch (e: any) {
      fail(res, 502, `Could not reach PubMed: ${e?.message || "unknown error"}. Try again shortly.`);
    }
  });

  app.post("/api/admin/literature/:id/approve", admin, async (req, res) => {
    const r = row("SELECT * FROM literature WHERE id = ?", req.params.id);
    if (!r) return fail(res, 404, "Paper not found.");
    if (r.status === "approved") return fail(res, 409, "Already approved.");
    const category = str(req.body?.category, 60) || r.condition_term;
    const takeaway = str(req.body?.takeaway, 400);
    if (takeaway.length < 20) return fail(res, 400, "Write a plain-language key takeaway (20 to 400 characters) so patients can understand the finding.");
    // Fresh retraction check at the moment of approval.
    try {
      const [p] = await fetchPapers([r.pmid]);
      if (p?.retracted) {
        db.prepare("UPDATE literature SET status = 'withdrawn', admin_note = ?, retraction_checked_at = ? WHERE id = ?").run("Retracted at source", iso(), r.id);
        return fail(res, 409, "This paper has been retracted, so it cannot be approved.");
      }
    } catch {
      return fail(res, 502, "Could not re-check this paper against PubMed. Try again.");
    }
    db.prepare("UPDATE literature SET status = 'approved', category = ?, takeaway = ?, admin_note = ?, reviewed_by = ?, reviewed_at = ?, retraction_checked_at = ? WHERE id = ?")
      .run(category, takeaway, str(req.body?.note, 500) || null, req.user!.id, iso(), iso(), r.id);
    audit(req, "literature.approve", { details: { pmid: r.pmid, category } });
    res.json({ status: "success", data: view(row("SELECT * FROM literature WHERE id = ?", r.id)) });
  });

  app.post("/api/admin/literature/:id/takeaway", admin, (req, res) => {
    const r = row("SELECT * FROM literature WHERE id = ?", req.params.id);
    if (!r) return fail(res, 404, "Paper not found.");
    const takeaway = str(req.body?.takeaway, 400);
    if (takeaway.length < 20) return fail(res, 400, "The key takeaway needs 20 to 400 characters.");
    db.prepare("UPDATE literature SET takeaway = ? WHERE id = ?").run(takeaway, r.id);
    audit(req, "literature.takeaway", { details: { pmid: r.pmid } });
    res.json({ status: "success", data: view(row("SELECT * FROM literature WHERE id = ?", r.id)) });
  });

  app.post("/api/admin/literature/:id/reject", admin, (req, res) => {
    const r = row("SELECT * FROM literature WHERE id = ?", req.params.id);
    if (!r) return fail(res, 404, "Paper not found.");
    db.prepare("UPDATE literature SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(str(req.body?.note, 500) || null, req.user!.id, iso(), r.id);
    audit(req, "literature.reject", { details: { pmid: r.pmid } });
    res.json({ status: "success", data: view(row("SELECT * FROM literature WHERE id = ?", r.id)) });
  });

  app.post("/api/admin/literature/:id/unpublish", admin, (req, res) => {
    const r = row("SELECT * FROM literature WHERE id = ?", req.params.id);
    if (!r) return fail(res, 404, "Paper not found.");
    db.prepare("UPDATE literature SET status = 'withdrawn', admin_note = ?, reviewed_by = ?, reviewed_at = ? WHERE id = ?").run(str(req.body?.note, 500) || "Unpublished by admin", req.user!.id, iso(), r.id);
    audit(req, "literature.unpublish", { details: { pmid: r.pmid } });
    res.json({ status: "success" });
  });

  /** Re-check every published paper against PubMed and pull any that have since been retracted. */
  app.post("/api/admin/literature/recheck", admin, async (req, res) => {
    const approved = rows("SELECT * FROM literature WHERE status = 'approved'");
    try {
      let withdrawn = 0;
      for (let i = 0; i < approved.length; i += 50) {
        const batch = approved.slice(i, i + 50);
        const papers = await fetchPapers(batch.map(b => b.pmid));
        for (const b of batch) {
          const p = papers.find(x => x.pmid === b.pmid);
          if (p?.retracted) { db.prepare("UPDATE literature SET status = 'withdrawn', admin_note = 'Retracted at source', retraction_checked_at = ? WHERE id = ?").run(iso(), b.id); withdrawn++; }
          else if (p) db.prepare("UPDATE literature SET retraction_checked_at = ? WHERE id = ?").run(iso(), b.id);
        }
      }
      audit(req, "literature.recheck", { details: { checked: approved.length, withdrawn } });
      res.json({ status: "success", data: { checked: approved.length, withdrawn } });
    } catch (e: any) {
      fail(res, 502, `Could not reach PubMed: ${e?.message || "unknown error"}.`);
    }
  });
}
