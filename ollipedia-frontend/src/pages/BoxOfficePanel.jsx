// src/components/admin/BoxOfficePanel.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  Complete rewrite — User-friendly Box Office Panel
//
//  Changes vs original:
//  1. Fixed data not showing — loadDays now properly resets state before fetch
//  2. Better UI — grid layout for inputs, cleaner spacing, summary card
//  3. Verdict REMOVED from table, summary card, and all blog content
//  4. Per-day AI blog generation using Groq (/api/admin/generate-article)
//     - Toggle inside the Add/Edit day modal
//     - Prompt auto-fills with movie + all days data, fully editable
//     - Generates content via Groq, user can edit before saving
//  5. Each day submission creates a SEPARATE blog:
//     Day 1 blog  → Day 1 data only
//     Day 2 blog  → Day 1 + Day 2 (cumulative)
//     Day N blog  → all days 1..N (cumulative)
//  6. Blog title format: "{Movie} ({Year}) Day {N} Box Office Collection"
//  7. Blog slug:  {movie-slug}-day-{n}-box-office-collection
//     New slug per day → new blog post per day (not overwriting the same post)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useRef, useCallback } from "react";
import { API, getAdminToken } from "../api/api";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtINR = (val) => {
  if (val === undefined || val === null || val === "") return "—";
  const n = typeof val === "string" ? parseFloat(val.replace(/[^0-9.]/g, "")) : Number(val);
  if (isNaN(n) || n === 0) return val || "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)} Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};

const parseNum = (s) => {
  const v = parseFloat(String(s || "").replace(/[^0-9.]/g, ""));
  return isNaN(v) ? 0 : v;
};

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

const getYear = (releaseDate) =>
  releaseDate ? new Date(releaseDate).getFullYear() : "";

// Builds the AI prompt for a specific target day, including all cumulative days
const buildAiPrompt = (movie, daysUpToN, totalNet, totalGross, targetDay) => {
  const year   = getYear(movie.releaseDate);
  const sorted = [...daysUpToN].sort((a, b) => a.day - b.day);
  const tableText = sorted
    .map((d) => `Day ${d.day}${d.date ? ` (${d.date})` : ""}: Net ${fmtINR(d.net)}, Gross ${fmtINR(d.gross)}${d.note ? ` — ${d.note}` : ""}`)
    .join("\n");

  return `Write an SEO-optimised blog article about the box office collection of the Odia film "${movie.title}"${year ? ` (${year})` : ""} for Day ${targetDay}.

Movie: ${movie.title}${year ? ` (${year})` : ""}
${movie.language ? `Language: ${movie.language}` : ""}
${movie.director ? `Director: ${movie.director}` : ""}
${movie.budget ? `Budget: ${movie.budget}` : ""}

Day-wise collection data (all days up to Day ${targetDay}):
${tableText}

Total Net: ${fmtINR(totalNet)}
Total Gross: ${fmtINR(totalGross)}

Requirements:
- Write 1000 -1200 words in flowing prose, no bullet points, no headers
- Naturally include the day-wise figures in the text
- Mention total net and gross collection prominently
- Write for an Odia cinema (Ollywood) audience
- End with: "All figures are industry estimates. Last updated: Day ${targetDay}. Source: Ollypedia."
- Do NOT mention or calculate any verdict/hit/flop judgement`;
};

// Builds the full HTML blog content from AI text + styled data table (no verdict)
const buildBlogContent = (movie, daysUpToN, totalNet, totalGross, targetDay, aiText) => {
  const year   = getYear(movie.releaseDate);
  const sorted = [...daysUpToN].sort((a, b) => a.day - b.day);

  const rows = sorted.map((d) => `    <tr>
      <td style="padding:10px 14px;font-weight:700;color:#c9973a;white-space:nowrap">Day ${d.day}${d.date ? `<br><small style="color:#888;font-weight:400">${d.date}</small>` : ""}</td>
      <td style="padding:10px 14px;font-weight:600">${fmtINR(d.net)}</td>
      <td style="padding:10px 14px;font-weight:600;color:#7ec8e3">${fmtINR(d.gross)}</td>
      <td style="padding:10px 14px;color:#888;font-size:0.9em">${d.note || "—"}</td>
    </tr>`).join("\n");

  // Convert plain AI prose into <p> tags — split on double newlines or single newlines
  const proseHtml = aiText?.trim()
    ? aiText.trim()
        .split(/\n{2,}/)
        .map(chunk => chunk.trim())
        .filter(Boolean)
        .map(chunk => {
          // Already an HTML tag — keep as-is
          if (/^<[a-z]/i.test(chunk)) return chunk;
          // Split single-newline lines within a chunk into one paragraph
          const text = chunk.split(/\n/).map(l => l.trim()).filter(Boolean).join(" ");
          return `<p>${text}</p>`;
        })
        .join("\n")
    : `<p><strong>${movie.title}</strong>${year ? ` (${year})` : ""} has been performing at the Odia box office since its release. Below is the complete day-wise collection breakdown updated through Day ${targetDay}.</p>`;

  return `<article>
<h1>${movie.title}${year ? ` (${year})` : ""} Day ${targetDay} Box Office Collection | Ollypedia</h1>

${proseHtml}

<h2>Day-wise Box Office Collection — ${movie.title}${year ? ` (${year})` : ""}</h2>

<div style="overflow-x:auto;border-radius:10px;border:1px solid #2a2a2a;margin:20px 0">
  <table style="width:100%;border-collapse:collapse;font-size:0.92em">
    <thead>
      <tr style="background:#141414">
        <th style="padding:11px 14px;text-align:left;font-size:0.7em;color:#888;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #2a2a2a">Day</th>
        <th style="padding:11px 14px;text-align:left;font-size:0.7em;color:#888;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #2a2a2a">Net Collection</th>
        <th style="padding:11px 14px;text-align:left;font-size:0.7em;color:#888;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #2a2a2a">Gross Collection</th>
        <th style="padding:11px 14px;text-align:left;font-size:0.7em;color:#888;text-transform:uppercase;letter-spacing:0.07em;border-bottom:2px solid #2a2a2a">Notes</th>
      </tr>
    </thead>
    <tbody>
${rows}
    </tbody>
    <tfoot>
      <tr style="background:rgba(201,151,58,0.06);border-top:2px solid #2a2a2a">
        <td style="padding:11px 14px;font-weight:800;color:#c9973a;font-size:0.78em;text-transform:uppercase;letter-spacing:0.06em" colspan="1">
          TOTAL (${sorted.length} day${sorted.length !== 1 ? "s" : ""})
        </td>
        <td style="padding:11px 14px;font-weight:800;color:#c9973a;font-size:1em">${fmtINR(totalNet)}</td>
        <td style="padding:11px 14px;font-weight:800;color:#7ec8e3;font-size:1em">${fmtINR(totalGross)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>
</div>

<h2>${movie.title} Total Box Office Collection</h2>
<p><strong>${movie.title}</strong>${year ? ` (${year})` : ""} has collected a cumulative net of <strong>${fmtINR(totalNet)}</strong> and a total gross of <strong>${fmtINR(totalGross)}</strong> over ${sorted.length} day${sorted.length !== 1 ? "s" : ""} of its theatrical run.</p>

<p><em>All figures are industry estimates from Odia trade circles. Final verified numbers may vary slightly. Last updated: Day ${targetDay}. Source: Ollypedia Box Office Tracker.</em></p>
</article>`;
};

// ─── Shared label style ────────────────────────────────────────────────────────
const lbl = {
  display: "block", fontSize: "0.72rem", color: "var(--muted)",
  fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.06em",
};

// ─── DayModal ─────────────────────────────────────────────────────────────────

function DayModal({ movie, isEdit, dayData, allDays, onClose, onSaved, onToast }) {
  const year    = getYear(movie.releaseDate);
  const nextDay = allDays.length ? Math.max(...allDays.map((d) => d.day)) + 1 : 1;

  const [form, setForm] = useState({
    day:   String(dayData?.day ?? nextDay),
    net:   String(dayData?.net   ?? ""),
    gross: String(dayData?.gross ?? ""),
    date:  String(dayData?.date  ?? new Date().toISOString().slice(0, 10)),
    note:  String(dayData?.note  ?? ""),
  });

  const [showAi,    setShowAi]    = useState(false);
  const [aiPrompt,  setAiPrompt]  = useState("");
  const [aiText,    setAiText]    = useState("");
  const [aiStatus,  setAiStatus]  = useState(""); // ""|"loading"|"done"|"error"
  const [saving,    setSaving]    = useState(false);
  const [err,       setErr]       = useState("");

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  // All days including the current one being entered (cumulative)
  const getDaysUpToN = useCallback(() => {
    const current = {
      day: parseInt(form.day, 10), net: form.net.trim(),
      gross: form.gross.trim(), date: form.date, note: form.note.trim(),
    };
    const others = (allDays || []).filter((d) => d.day !== current.day);
    return [...others, current].sort((a, b) => a.day - b.day);
  }, [form, allDays]);

  // Auto-populate prompt when AI section opens
  useEffect(() => {
    if (!showAi) return;
    const targetDay  = parseInt(form.day, 10);
    const daysUpToN  = getDaysUpToN();
    const totalNet   = daysUpToN.reduce((s, d) => s + parseNum(d.net),   0);
    const totalGross = daysUpToN.reduce((s, d) => s + parseNum(d.gross), 0);
    setAiPrompt(buildAiPrompt(movie, daysUpToN, totalNet, totalGross, targetDay));
  }, [showAi]);

  const generateAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiStatus("loading");
    setAiText("");
    try {
      const token = getAdminToken();
      const res   = await fetch(`${BASE}/admin/generate-article`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      setAiText(data.text || "");
      setAiStatus("done");
    } catch (e) {
      setAiStatus("error");
      onToast("❌ AI generation failed: " + e.message, "error");
    }
  };

  const handleSave = async () => {
    if (!form.net.trim() && !form.gross.trim()) {
      setErr("Enter at least Net or Gross collection.");
      return;
    }
    setSaving(true);
    setErr("");
    const payload = {
      day:   parseInt(form.day, 10),
      net:   form.net.trim(),
      gross: form.gross.trim(),
      date:  form.date,
      note:  form.note.trim(),
    };

    try {
      // 1. Save day to DB
      if (isEdit) {
        await API.adminUpdateBoxOfficeDay(movie._id, payload.day, payload);
      } else {
        await API.adminAddBoxOfficeDay(movie._id, payload);
      }
      onToast(`Day ${payload.day} ${isEdit ? "updated" : "added"}!`, "success");

      // 2. Publish per-day blog if AI toggle is ON
      if (showAi) {
        const daysUpToN  = getDaysUpToN();
        const totalNet   = daysUpToN.reduce((s, d) => s + parseNum(d.net),   0);
        const totalGross = daysUpToN.reduce((s, d) => s + parseNum(d.gross), 0);
        const targetDay  = payload.day;
        const blogTitle  = `${movie.title}${year ? ` (${year})` : ""} Day ${targetDay} Box Office Collection`;
        const blogSlug   = slugify(blogTitle);
        const content    = buildBlogContent(movie, daysUpToN, totalNet, totalGross, targetDay, aiText);
        const excerpt    = `${blogTitle}: Net ${fmtINR(payload.net || 0)}, Gross ${fmtINR(payload.gross || 0)}. Total ${fmtINR(totalNet)} net in ${daysUpToN.length} day${daysUpToN.length !== 1 ? "s" : ""}.`;

        const blogPayload = {
          title: blogTitle, slug: blogSlug, excerpt, content,
          category:   "Box Office",
          tags:       [movie.title, "Box Office", "Odia Cinema", "Ollywood", `Day ${targetDay}`, year ? String(year) : ""].filter(Boolean),
          coverImage: movie.bannerUrl || movie.posterUrl || "",
          movieId:    movie._id, movieTitle: movie.title,
          published:  true, featured: false,
          seoTitle:   `${blogTitle} | Ollypedia`,
          seoDesc:    excerpt,
        };

        // Look for existing blog with this exact slug (per-day, not per-movie)
        let existingId = null;
        try {
          const allBlogs = await API.adminGetBlogPosts();
          const match = allBlogs.find((b) => b.slug === blogSlug);
          if (match) existingId = match._id;
        } catch {}

        if (existingId) {
          await API.adminUpdateBlog(existingId, blogPayload);
          onToast(`✅ Day ${targetDay} blog updated at /blog/${blogSlug}`, "success");
        } else {
          await API.adminCreateBlog(blogPayload);
          onToast(`✅ Day ${targetDay} blog published at /blog/${blogSlug}`, "success");
        }
      }

      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const targetDay = parseInt(form.day, 10);
  const blogSlugPreview = slugify(`${movie.title}${year ? ` (${year})` : ""} day ${targetDay} box office collection`);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 580, maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-header">
          <span className="modal-title">
            {isEdit ? `✏️ Edit Day ${dayData.day}` : `➕ Add Day ${form.day}`} — {movie.title}{year ? ` (${year})` : ""}
          </span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div style={{ padding: "22px 24px" }}>
          {err && (
            <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.4)", borderRadius: 8, color: "#e87a6a", fontSize: "0.82rem" }}>
              ⚠️ {err}
            </div>
          )}

          {/* Row 1: Day + Date */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Day Number</label>
              <input className="form-input" style={{ width: "100%", boxSizing: "border-box" }}
                type="number" min="1" value={form.day} onChange={set("day")} disabled={isEdit} />
            </div>
            <div>
              <label style={lbl}>Date</label>
              <input className="form-input" style={{ width: "100%", boxSizing: "border-box" }}
                type="date" value={form.date} onChange={set("date")} />
            </div>
          </div>

          {/* Row 2: Net + Gross */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>Net Collection (₹)</label>
              <input className="form-input" style={{ width: "100%", boxSizing: "border-box" }}
                type="text" placeholder="e.g. 45,00,000" value={form.net} onChange={set("net")} autoFocus={!isEdit} />
            </div>
            <div>
              <label style={lbl}>Gross Collection (₹)</label>
              <input className="form-input" style={{ width: "100%", boxSizing: "border-box" }}
                type="text" placeholder="e.g. 53,00,000" value={form.gross} onChange={set("gross")} />
            </div>
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Notes (optional)</label>
            <input className="form-input" style={{ width: "100%", boxSizing: "border-box" }}
              type="text" placeholder="e.g. 2nd Saturday, Holiday boost" value={form.note} onChange={set("note")} />
          </div>

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border)", margin: "0 0 20px" }} />

          {/* AI Blog Toggle */}
          <div
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: showAi ? 16 : 0, cursor: "pointer", userSelect: "none" }}
            onClick={() => setShowAi((p) => !p)}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>🤖 Generate AI Blog for Day {targetDay}</div>
              <div style={{ fontSize: "0.71rem", color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>
                Will publish at{" "}
                <code style={{ background: "var(--bg3)", padding: "1px 6px", borderRadius: 4, color: "var(--gold)", fontSize: "0.68rem" }}>
                  /blog/{blogSlugPreview}
                </code>
                {" "}with Day 1–{targetDay} cumulative data
              </div>
            </div>
            {/* Toggle switch */}
            <div style={{ width: 42, height: 24, borderRadius: 12, background: showAi ? "var(--gold)" : "var(--bg3)", border: "1px solid var(--border)", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 3, left: showAi ? 21 : 3, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" }} />
            </div>
          </div>

          {/* AI section */}
          {showAi && (
            <div style={{ background: "rgba(201,151,58,0.04)", border: "1px solid rgba(201,151,58,0.18)", borderRadius: 10, padding: "16px 18px", marginBottom: 18 }}>
              <label style={{ ...lbl, color: "#c9973a" }}>AI Prompt (edit before generating)</label>
              <textarea
                className="form-input"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={7}
                style={{ width: "100%", boxSizing: "border-box", fontSize: "0.76rem", lineHeight: 1.65, resize: "vertical", fontFamily: "monospace", marginBottom: 10 }}
                placeholder="Prompt will auto-fill when you open this section…"
              />
              <button className="btn btn-sm"
                style={{ width: "100%", background: "rgba(201,151,58,0.14)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.4)", fontWeight: 700 }}
                onClick={generateAi}
                disabled={aiStatus === "loading" || !aiPrompt.trim()}
              >
                {aiStatus === "loading" ? "⏳ Generating with Groq AI…" : aiStatus === "done" ? "✅ Regenerate" : "🤖 Generate Blog Content"}
              </button>

              {aiStatus === "error" && (
                <div style={{ marginTop: 10, fontSize: "0.78rem", color: "#e87a6a" }}>
                  ❌ Generation failed — check GROQ_API_KEY in .env, then retry.
                </div>
              )}

              {aiStatus === "done" && aiText && (
                <div style={{ marginTop: 14 }}>
                  <label style={{ ...lbl, color: "#c9973a" }}>Generated Content (editable)</label>
                  <textarea
                    className="form-input"
                    value={aiText}
                    onChange={(e) => setAiText(e.target.value)}
                    rows={8}
                    style={{ width: "100%", boxSizing: "border-box", fontSize: "0.77rem", lineHeight: 1.7, resize: "vertical" }}
                  />
                  <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 4 }}>
                    ✏️ Edit freely. This will be wrapped in the styled HTML table and published as an article.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-gold" style={{ flex: 2, fontWeight: 800 }} onClick={handleSave}
              disabled={saving || (showAi && aiStatus === "loading")}>
              {saving
                ? "Saving…"
                : showAi
                ? `💾 Save Day ${targetDay} + Publish Blog`
                : `💾 Save Day ${targetDay}`}
            </button>
          </div>

          {showAi && (
            <p style={{ marginTop: 10, fontSize: "0.7rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }}>
              Day {targetDay} blog will include <strong style={{ color: "var(--text)" }}>all days 1–{targetDay}</strong> in the table.
              Day 1 blog has 1 row, Day 2 has 2 rows, and so on.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main BoxOfficePanel ───────────────────────────────────────────────────────

export default function BoxOfficePanel({ movies, onToast }) {
  const [query,       setQuery]       = useState("");
  const [dropResults, setDropResults] = useState([]);
  const [showDrop,    setShowDrop]    = useState(false);
  const [selMovie,    setSelMovie]    = useState(null);
  const [days,        setDays]        = useState([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [modal,       setModal]       = useState(null); // { isEdit, dayData } | null
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Movie search dropdown
  useEffect(() => {
    if (!query.trim() || selMovie) { setDropResults([]); setShowDrop(false); return; }
    const q        = query.toLowerCase();
    const filtered = (Array.isArray(movies) ? movies : [])
      .filter((m) => (m.title || "").toLowerCase().includes(q))
      .slice(0, 8);
    setDropResults(filtered);
    setShowDrop(filtered.length > 0);
  }, [query, movies, selMovie]);

  // FIX: explicitly reset days + set loading before fetch so UI updates
  const loadDays = useCallback(async (movie) => {
    if (!movie?._id) return;
    setDays([]);
    setLoadingDays(true);
    try {
      const data   = await API.getMovieBoxOfficeDays(movie._id);
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => a.day - b.day) : [];
      setDays(sorted);
    } catch (e) {
      onToast?.("Failed to load data: " + e.message, "error");
      setDays([]);
    } finally {
      setLoadingDays(false);
    }
  }, [onToast]);

  const selectMovie = (m) => {
    setSelMovie(m);
    setQuery(m.title);
    setShowDrop(false);
    loadDays(m);
  };

  const clearMovie = () => { setSelMovie(null); setQuery(""); setDays([]); };

  // Derived
  const totalNet   = days.reduce((s, d) => s + parseNum(d.net),   0);
  const totalGross = days.reduce((s, d) => s + parseNum(d.gross), 0);
  const nextDay    = days.length ? Math.max(...days.map((d) => d.day)) + 1 : 1;
  const year       = selMovie ? getYear(selMovie.releaseDate) : "";

  return (
    <div style={{ padding: "0 28px 60px" }}>

      {/* ── Sticky Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
        position: "sticky", top: 0, zIndex: 50,
        background: "var(--bg1)", padding: "13px 28px", margin: "0 -28px 28px",
        boxShadow: "0 2px 20px rgba(0,0,0,0.5)", borderBottom: "1px solid var(--border)",
      }}>
        <h2 style={{ fontSize: "1.3rem", margin: 0, fontWeight: 800 }}>
          📊 Box Office
        </h2>
        {selMovie && (
          <span style={{ fontSize: "0.74rem", color: "var(--gold)", background: "rgba(201,151,58,0.1)", border: "1px solid rgba(201,151,58,0.25)", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }}>
            {selMovie.title}{year ? ` (${year})` : ""}
          </span>
        )}
        {selMovie && days.length > 0 && (
          <span style={{ fontSize: "0.68rem", color: "var(--muted)", background: "var(--bg3)", padding: "3px 9px", borderRadius: 10, fontWeight: 600 }}>
            {days.length} day{days.length !== 1 ? "s" : ""} recorded
          </span>
        )}
        <div style={{ flex: 1 }} />
        {selMovie && (
          <button className="btn btn-gold btn-sm" style={{ fontWeight: 800 }}
            onClick={() => setModal({ isEdit: false, dayData: null })}>
            + Add Day {nextDay}
          </button>
        )}
      </div>

      {/* ── Movie Search ── */}
      <div style={{ maxWidth: 500, marginBottom: 32 }}>
        <label style={{ ...lbl, marginBottom: 8, fontSize: "0.78rem" }}>Search Movie</label>
        <div ref={dropRef} style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none", zIndex: 1 }}>🔍</span>
          <input
            className="form-input"
            style={{ paddingLeft: 38, paddingRight: selMovie ? 36 : 14, width: "100%", boxSizing: "border-box" }}
            placeholder="Type movie name to search…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); if (selMovie) { setSelMovie(null); setDays([]); } }}
            onFocus={() => dropResults.length > 0 && setShowDrop(true)}
          />
          {selMovie && (
            <button onClick={clearMovie} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1.2rem", padding: 0 }}>×</button>
          )}
          {showDrop && dropResults.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 200, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.65)" }}>
              {dropResults.map((m) => (
                <button key={m._id} onClick={() => selectMovie(m)}
                  style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--border)" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(201,151,58,0.09)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "none"}
                >
                  {(m.posterUrl || m.thumbnailUrl) && (
                    <img src={m.posterUrl || m.thumbnailUrl} alt={m.title} style={{ width: 28, height: 38, objectFit: "cover", borderRadius: 4, flexShrink: 0 }} onError={(e) => e.target.style.display = "none"} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{m.title}</div>
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)" }}>
                      {m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA"}
                      {m.language ? ` · ${m.language}` : ""}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {showDrop && dropResults.length === 0 && query.trim() && !selMovie && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 200, padding: 16, color: "var(--muted)", fontSize: "0.83rem" }}>
              No movies found for "{query}"
            </div>
          )}
        </div>
      </div>

      {/* ── Empty state ── */}
      {!selMovie && (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--muted)" }}>
          <div style={{ fontSize: "4rem", marginBottom: 16 }}>📊</div>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 8, color: "var(--text)" }}>Box Office Tracker</div>
          <div style={{ fontSize: "0.84rem", maxWidth: 380, margin: "0 auto", lineHeight: 1.8 }}>
            Search a movie above to record day-wise collection and publish AI-powered box office blogs per day.
          </div>
        </div>
      )}

      {/* ── Movie selected ── */}
      {selMovie && (
        <>
          {/* Summary card */}
          <div style={{ background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 28, overflow: "hidden", position: "relative" }}>
            {selMovie.bannerUrl && (
              <img src={selMovie.bannerUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.06, pointerEvents: "none" }} onError={(e) => e.target.style.display = "none"} />
            )}
            <div style={{ display: "flex", gap: 20, alignItems: "flex-start", position: "relative", zIndex: 1 }}>
              {(selMovie.posterUrl || selMovie.thumbnailUrl) && (
                <img src={selMovie.posterUrl || selMovie.thumbnailUrl} alt={selMovie.title}
                  style={{ width: 68, height: 94, objectFit: "cover", borderRadius: 10, flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.7)" }}
                  onError={(e) => e.target.style.display = "none"} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.2, marginBottom: 4 }}>
                  {selMovie.title}{year ? ` (${year})` : ""}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginBottom: 16 }}>
                  {selMovie.releaseDate ? new Date(selMovie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Release TBA"}
                  {selMovie.language ? ` · ${selMovie.language}` : ""}
                  {selMovie.budget ? ` · Budget: ${selMovie.budget}` : ""}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {[
                    { label: "Total Net",   value: fmtINR(totalNet),   color: "var(--gold)" },
                    { label: "Total Gross", value: fmtINR(totalGross), color: "#7ec8e3"      },
                    { label: "Days",        value: loadingDays ? "…" : (days.length || "—"), color: "var(--text)" },
                  ].map(({ label: l, value, color }) => (
                    <div key={l} style={{ background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: "9px 16px", border: "1px solid rgba(255,255,255,0.06)", minWidth: 110 }}>
                      <div style={{ fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }}>{l}</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Loading */}
          {loadingDays && (
            <div style={{ textAlign: "center", padding: 52, color: "var(--muted)" }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>⏳</div>
              <div style={{ fontSize: "0.88rem" }}>Loading collection data…</div>
            </div>
          )}

          {/* Empty days */}
          {!loadingDays && days.length === 0 && (
            <div style={{ textAlign: "center", padding: "52px 0", color: "var(--muted)" }}>
              <div style={{ fontSize: "2.8rem", marginBottom: 10 }}>📭</div>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "var(--text)", fontSize: "1rem" }}>No collection data yet</div>
              <div style={{ fontSize: "0.8rem", marginBottom: 20 }}>Click the button below to record the opening day collection.</div>
              <button className="btn btn-gold btn-sm" style={{ fontWeight: 800 }}
                onClick={() => setModal({ isEdit: false, dayData: null })}>
                + Add Day 1 Collection
              </button>
            </div>
          )}

          {/* Collection table */}
          {!loadingDays && days.length > 0 && (
            <>
              <div style={{ overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }}>
                  <thead>
                    <tr style={{ background: "var(--bg2)" }}>
                      {["Day", "Date", "Net Collection", "Gross Collection", "Notes", ""].map((h, i) => (
                        <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.64rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, whiteSpace: "nowrap", borderBottom: "2px solid var(--border)" }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map((d, i) => (
                      <tr key={d.day}
                        style={{ borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)", transition: "background 0.1s" }}
                        onMouseEnter={(e) => e.currentTarget.style.background = "rgba(201,151,58,0.05)"}
                        onMouseLeave={(e) => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)"}
                      >
                        <td style={{ padding: "12px 16px", fontWeight: 800, color: "var(--gold)", whiteSpace: "nowrap" }}>
                          Day {d.day}
                          {d.day === 1 && <span style={{ marginLeft: 6, fontSize: "0.6rem", background: "rgba(201,151,58,0.14)", color: "var(--gold)", padding: "1px 6px", borderRadius: 8 }}>Opening</span>}
                        </td>
                        <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "0.8rem" }}>
                          {d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}
                        </td>
                        <td style={{ padding: "12px 16px", fontWeight: 700 }}>{fmtINR(d.net)}</td>
                        <td style={{ padding: "12px 16px", fontWeight: 600, color: "#7ec8e3" }}>{fmtINR(d.gross)}</td>
                        <td style={{ padding: "12px 16px", color: "var(--muted)", fontSize: "0.78rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {d.note || "—"}
                        </td>
                        <td style={{ padding: "12px 16px", whiteSpace: "nowrap", display: "flex", gap: 6 }}>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: "0.72rem", padding: "4px 12px" }}
                            onClick={() => setModal({ isEdit: true, dayData: d })}>
                            ✏️ Edit
                          </button>
                          <button className="btn btn-ghost btn-sm"
                            style={{ fontSize: "0.72rem", padding: "4px 12px", color: "#e87a6a", border: "1px solid rgba(220,50,50,0.35)" }}
                            onClick={async () => {
                              if (!window.confirm(`Delete Day ${d.day} collection data? This cannot be undone.`)) return;
                              try {
                                await API.adminDeleteBoxOfficeDay(selMovie._id, d.day);
                                onToast(`Day ${d.day} deleted.`, "success");
                                loadDays(selMovie);
                              } catch (e) {
                                onToast("❌ Delete failed: " + e.message, "error");
                              }
                            }}>
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "rgba(201,151,58,0.07)", borderTop: "2px solid var(--border)" }}>
                      <td colSpan={2} style={{ padding: "12px 16px", fontWeight: 800, fontSize: "0.78rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        TOTAL ({days.length} day{days.length !== 1 ? "s" : ""})
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 800, color: "var(--gold)", fontSize: "1rem" }}>{fmtINR(totalNet)}</td>
                      <td style={{ padding: "12px 16px", fontWeight: 800, color: "#7ec8e3", fontSize: "1rem" }}>{fmtINR(totalGross)}</td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Tip bar */}
              <div style={{ marginTop: 14, padding: "11px 16px", background: "rgba(201,151,58,0.04)", border: "1px solid rgba(201,151,58,0.14)", borderRadius: 10, fontSize: "0.77rem", color: "var(--muted)", lineHeight: 1.7 }}>
                💡 <strong style={{ color: "var(--text)" }}>Tip:</strong> Use <strong style={{ color: "var(--gold)" }}>+ Add Day {nextDay}</strong> to record new data.
                Toggle <strong style={{ color: "var(--gold)" }}>🤖 AI Blog</strong> inside the form to publish a Day {nextDay} article
                (with all days 1–{nextDay} in the table) as a separate blog post.
              </div>
            </>
          )}
        </>
      )}

      {/* Day Modal */}
      {modal && selMovie && (
        <DayModal
          movie={selMovie}
          isEdit={modal.isEdit}
          dayData={modal.isEdit ? modal.dayData : null}
          allDays={days}
          onClose={() => setModal(null)}
          onSaved={() => loadDays(selMovie)}
          onToast={onToast}
        />
      )}
    </div>
  );
}