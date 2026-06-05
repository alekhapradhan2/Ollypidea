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

// ─── Cast/Crew extractor (mirrors page.tsx logic) ─────────────────────────────
const extractCastInfo = (movie) => {
  const cast = Array.isArray(movie.cast) ? movie.cast : [];

  const findByRole = (keywords) =>
    cast.find((m) => {
      const r = (m.role || m.type || "").toLowerCase();
      return keywords.some((k) => r.includes(k));
    })?.name || null;

  // Director — pure "director" only, not music/art/action/assistant director
  const directorEntry = cast.find((m) => {
    const r = (m.role || m.type || "").toLowerCase().trim();
    return r === "director" || r === "film director" || r === "movie director" ||
      (r.includes("director") && !["music","art","action","stunt","assistant","co-","associate"].some(x => r.includes(x)));
  });
  const directorName = directorEntry?.name || movie.director || null;

  // Producer — pure "producer" only
  const producerEntry = cast.find((m) => {
    const r = (m.role || m.type || "").toLowerCase().trim();
    return r === "producer" ||
      (r.includes("producer") && !["executive","co-","line","associate","assistant"].some(x => r.includes(x)));
  });
  const producerName = producerEntry?.name || movie.producer || null;

  const musicDirector = findByRole(["music director"]) || null;
  const writer        = findByRole(["writer","screenplay","story","dialogue"]) || null;
  const dop           = findByRole(["cinematographer","dop","director of photography"]) || null;
  const editor        = findByRole(["editor"]) || null;

  // All on-screen cast (not pure crew)
  const CREW_KW = ["director","producer","writer","screenplay","story","dialogue","music director","cinematographer","dop","editor","choreographer","art director","costume","sound","stunt","vfx"];
  const actingKW = ["actor","actress","lead","hero","heroine","supporting","cameo","special appearance"];
  const actors = cast.filter((m) => {
    const r = (m.role || m.type || "").toLowerCase();
    const isCrew = CREW_KW.some((k) => r.includes(k)) && !actingKW.some((k) => r.includes(k));
    return !isCrew;
  });

  const leadActors    = actors.slice(0, 4).map((m) => m.name).filter(Boolean);
  const leadActresses = actors
    .filter((m) => { const r = (m.role || m.type || "").toLowerCase(); return r.includes("actress") || r.includes("heroine"); })
    .slice(0, 2).map((m) => m.name).filter(Boolean);

  return { directorName, producerName, musicDirector, writer, dop, editor, leadActors, leadActresses };
};

// Builds the AI prompt — returns structured JSON sections for the sample HTML template
const buildAiPrompt = (movie, daysUpToN, totalNet, totalGross, targetDay) => {
  const year   = getYear(movie.releaseDate);
  const sorted = [...daysUpToN].sort((a, b) => a.day - b.day);
  const tableText = sorted
    .map((d) => `Day ${d.day}${d.date ? ` (${d.date})` : ""}: Net ${fmtINR(d.net)}, Gross ${fmtINR(d.gross)}${d.note ? ` — ${d.note}` : ""}`)
    .join("\n");

  const ci = extractCastInfo(movie);
  const castLine = [
    ci.directorName ? `Director: ${ci.directorName}` : "",
    ci.producerName ? `Producer: ${ci.producerName}` : "",
    ci.musicDirector ? `Music Director: ${ci.musicDirector}` : "",
    ci.writer ? `Writer: ${ci.writer}` : "",
    ci.leadActors.length ? `Cast: ${ci.leadActors.join(", ")}` : "",
    ci.leadActresses.length ? `Actresses: ${ci.leadActresses.join(", ")}` : "",
  ].filter(Boolean).join("\n");

  return `You are writing a box office collection article for the Odia film website Ollypedia.

Movie: ${movie.title}${year ? ` (${year})` : ""}
${movie.language ? `Language: ${movie.language}` : "Language: Odia"}
Genre: ${Array.isArray(movie.genre) ? movie.genre.join(", ") : (movie.genre || "Drama")}
Release Date: ${movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""}
${castLine}
${movie.budget ? `Budget: ${movie.budget}` : ""}

Day-wise collection data (all days up to Day ${targetDay}):
${tableText}

Total Net: ${fmtINR(totalNet)}
Total Gross: ${fmtINR(totalGross)}

You must respond ONLY with a valid JSON object (no markdown, no code fences, no extra text). The JSON must have exactly these keys:

{
  "seoHeadline": "A compelling 10-15 word headline for the h1 tag",
  "introParagraph": "2-3 sentences introducing the film and Day ${targetDay} performance. Mention the net and gross figures naturally.",
  "boxOfficeAnalysis": "2-3 paragraphs (plain text, no HTML tags) covering the day-wise journey, trending up or down, weekend/weekday patterns. Mention each day's figures naturally.",
  "audienceResponse": "1-2 paragraphs about how Odia audiences are responding — word of mouth, social media buzz, repeat viewing. Keep it positive and engaging.",
  "performanceAnalysis": "2 paragraphs analysing the film's performance relative to its budget and typical Odia cinema benchmarks. Mention total net ${fmtINR(totalNet)} and gross ${fmtINR(totalGross)}.",
  "prediction": "1-2 paragraphs predicting upcoming weekend/week performance based on current trend.",
  "finalVerdict": "2-3 sentences summarising the film's box office status after Day ${targetDay}. Do NOT use words like Hit, Flop, Average, Super-Hit — just describe the collection factually."
}

Rules:
- All values must be plain text only — no HTML, no bullet points, no markdown
- Write for an Odia cinema (Ollywood) audience
- Keep each section concise but informative
- Do not invent or fabricate collection figures — only use the data provided above`;
};

// Parse AI JSON response into sections (with safe fallbacks)
const parseAiSections = (aiText, movie, targetDay, totalNet, totalGross) => {
  const year = getYear(movie.releaseDate);
  const fallback = (key) => {
    const defaults = {
      seoHeadline:       `${movie.title}${year ? ` (${year})` : ""} Day ${targetDay} Box Office Collection Report`,
      introParagraph:    `${movie.title}${year ? ` (${year})` : ""} continues its theatrical run. On Day ${targetDay}, the film has collected a total net of ${fmtINR(totalNet)} and gross of ${fmtINR(totalGross)} at the Odia box office.`,
      boxOfficeAnalysis: `${movie.title} has shown a consistent run at the box office. The day-wise figures indicate steady audience interest across the state of Odisha.`,
      audienceResponse:  `Audiences across Odisha have given ${movie.title} a warm response. The film continues to attract viewers with positive word of mouth.`,
      performanceAnalysis:`With a total net collection of ${fmtINR(totalNet)} and gross of ${fmtINR(totalGross)}, ${movie.title} has delivered a notable performance for Odia cinema.`,
      prediction:        `Based on current trends, ${movie.title} is expected to maintain momentum in the coming days, especially during weekends.`,
      finalVerdict:      `${movie.title} has collected ${fmtINR(totalNet)} net and ${fmtINR(totalGross)} gross after ${targetDay} days. All figures are industry estimates. Source: Ollypedia.`,
    };
    return defaults[key] || "";
  };

  if (!aiText?.trim()) {
    return Object.fromEntries(["seoHeadline","introParagraph","boxOfficeAnalysis","audienceResponse","performanceAnalysis","prediction","finalVerdict"].map(k => [k, fallback(k)]));
  }

  try {
    // Strip markdown code fences if present
    const clean = aiText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);
    return {
      seoHeadline:       parsed.seoHeadline       || fallback("seoHeadline"),
      introParagraph:    parsed.introParagraph     || fallback("introParagraph"),
      boxOfficeAnalysis: parsed.boxOfficeAnalysis  || fallback("boxOfficeAnalysis"),
      audienceResponse:  parsed.audienceResponse   || fallback("audienceResponse"),
      performanceAnalysis: parsed.performanceAnalysis || fallback("performanceAnalysis"),
      prediction:        parsed.prediction         || fallback("prediction"),
      finalVerdict:      parsed.finalVerdict       || fallback("finalVerdict"),
    };
  } catch {
    // AI returned prose instead of JSON — use it as the analysis section, rest as fallbacks
    return {
      seoHeadline:        fallback("seoHeadline"),
      introParagraph:     fallback("introParagraph"),
      boxOfficeAnalysis:  aiText.trim(),
      audienceResponse:   fallback("audienceResponse"),
      performanceAnalysis: fallback("performanceAnalysis"),
      prediction:         fallback("prediction"),
      finalVerdict:       fallback("finalVerdict"),
    };
  }
};

// Converts plain text with paragraphs into <p> tags
const toParagraphs = (text) =>
  String(text || "")
    .trim()
    .split(/\n{2,}/)
    .map(chunk => chunk.split(/\n/).map(l => l.trim()).filter(Boolean).join(" ").trim())
    .filter(Boolean)
    .map(p => `<p>${p}</p>`)
    .join("\n");

// Builds the full HTML blog matching the sample_html.txt template exactly
const buildBlogContent = (movie, daysUpToN, totalNet, totalGross, targetDay, sectionsOrRaw) => {
  const year        = getYear(movie.releaseDate);
  const sorted      = [...daysUpToN].sort((a, b) => a.day - b.day);
  const sections = (sectionsOrRaw && typeof sectionsOrRaw === "object" && "seoHeadline" in sectionsOrRaw)
    ? sectionsOrRaw
    : parseAiSections(sectionsOrRaw, movie, targetDay, totalNet, totalGross);
  const movieName   = movie.title || "Unknown Movie";
  const releaseDate = movie.releaseDate
    ? new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const genreArr       = Array.isArray(movie.genre) ? movie.genre : (movie.genre ? [movie.genre] : []);
  const genre          = genreArr.join(", ") || "Drama";
  const movieSlug      = slugify(`${movieName}${year ? ` (${year})` : ""}`);
  const boxOfficeUrl   = `/box-office/${movieSlug}`;
  const movieNameNoSpace = movieName.replace(/\s+/g, "");

  // ── Extract cast/crew for rich keywords
  const crew = extractCastInfo(movie);
  const { directorName, producerName, musicDirector, writer, dop, editor, leadActors, leadActresses } = crew;

  // ── Shared inline style tokens (dark-theme safe, all inline so no <style> needed)
  const S = {
    section:  `background:#1a1a1a;border-radius:12px;padding:24px 28px;margin-bottom:28px;`,
    h2:       `font-size:1.15rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 18px;line-height:1.3;`,
    tbl:      `width:100%;border-collapse:collapse;font-size:0.93rem;`,
    th:       `background:#ff6b00;color:#fff;padding:11px 14px;text-align:left;font-weight:700;`,
    tdLabel:  `padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#bbb;font-weight:600;width:50%;`,
    tdValue:  `padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#fff;font-weight:700;`,
    tdDay:    `padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#c9973a;font-weight:700;`,
    tdNet:    `padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#fff;font-weight:600;`,
    tdGross:  `padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#7ec8e3;font-weight:600;`,
    tfootTd:  `padding:12px 14px;background:#252008;color:#c9973a;font-weight:800;font-size:1rem;border-top:2px solid #c9973a;`,
    tfootGross:`padding:12px 14px;background:#252008;color:#7ec8e3;font-weight:800;font-size:1rem;border-top:2px solid #c9973a;`,
    hero:     `background:linear-gradient(135deg,#1a0e00 0%,#1a1200 100%);border:1px solid #3a2800;border-radius:12px;padding:28px;margin-bottom:28px;`,
    highlight:`background:#1a0e00;border-left:5px solid #ff9800;border-radius:0 8px 8px 0;padding:16px 20px;margin:0 0 28px;`,
    btn:      `display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:0.95rem;`,
    tag:      `display:inline-block;background:#1e1e1e;color:#c9973a;border:1px solid #3a2800;border-radius:20px;padding:4px 12px;margin:4px;font-size:0.8rem;font-weight:600;`,
    p:        `color:#ccc;line-height:1.85;margin:0 0 14px;font-size:0.97rem;`,
  };

  // Day-wise table rows
  const rows = sorted.map((d) => `<tr>
    <td style="${S.tdDay}">Day ${d.day}${d.date ? `<br><small style="color:#888;font-size:0.78em;font-weight:400">${new Date(d.date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</small>` : ""}</td>
    <td style="${S.tdNet}">${d.net ? fmtINR(d.net) : "—"}</td>
    <td style="${S.tdGross}">${d.gross ? fmtINR(d.gross) : "—"}</td>
    ${d.note ? `<td style="padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#888;font-size:0.82rem;">${d.note}</td>` : `<td style="padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#555;">—</td>`}
  </tr>`).join("\n");

  // Current day figures
  const currentDay  = sorted.find(d => d.day === targetDay) || sorted[sorted.length - 1] || {};
  const dayNet      = currentDay.net   ? fmtINR(currentDay.net)   : "—";
  const dayGross    = currentDay.gross ? fmtINR(currentDay.gross) : "—";
  const totalNetStr   = fmtINR(totalNet);
  const totalGrossStr = fmtINR(totalGross);

  // Tags array
  const tags = [
    `#${movieNameNoSpace}`, `#${movieNameNoSpace}Collection`,
    `#${movieNameNoSpace}BoxOffice`, `#${movieNameNoSpace}Day${targetDay}`,
    directorName   ? `#${directorName.replace(/\s+/g,"")}` : null,
    producerName   ? `#${producerName.replace(/\s+/g,"")}` : null,
    musicDirector  ? `#${musicDirector.replace(/\s+/g,"")}` : null,
    ...leadActors.map(a => `#${a.replace(/\s+/g,"")}`),
    ...leadActresses.map(a => `#${a.replace(/\s+/g,"")}`),
    "#OdiaMovie", "#Ollywood", "#OdiaCinema", "#Ollypedia",
    "#BoxOfficeCollection", "#OllywoodBoxOffice", "#OllywoodNews", "#EntertainmentNews",
    year ? `#OdiaMovie${year}` : null,
  ].filter(Boolean);

  // Helper: wrap plain text sections into <p> tags with inline style
  const pWrap = (text) => toParagraphs(text)
    .replace(/<p>/g, `<p style="${S.p}">`);

  // ── Build rich keyword list from all available crew/cast data
  const buildKeywords = () => {
    const kw = [];
    // Movie name variants
    kw.push(
      `${movieName} Movie`, `${movieName} Odia Movie`, `${movieName} Movie Details`,
      `${movieName} Cast`, `${movieName} Cast and Crew`, `${movieName} Story`,
      `${movieName} Review`, `${movieName} Trailer`, `${movieName} Teaser`,
      `${movieName} Songs`, `${movieName} Music`, `${movieName} Release Date`,
      `${movieName} Box Office Collection`, `${movieName} Day ${targetDay} Collection`,
      `${movieName} Total Collection`, `${movieName} Gross Collection`,
      `${movieName} Net Collection`, `${movieName} Audience Response`,
      `${movieName} Movie Update`, `${movieName} Latest News`, `${movieName} Movie Collection`,
      year ? `${movieName} (${year})` : null,
    );
    // Director
    if (directorName) kw.push(directorName, `${directorName} Movie`, `${directorName} Odia Movie`, `${directorName} Director`);
    // Producer
    if (producerName) kw.push(producerName, `${producerName} Producer`);
    // Lead Actors (up to 4)
    leadActors.forEach(a => kw.push(a, `${a} Movie`, `${a} Odia Movie`));
    // Lead Actresses
    leadActresses.forEach(a => kw.push(a, `${a} Movie`, `${a} Odia Actress`));
    // Music Director
    if (musicDirector) kw.push(musicDirector, `${musicDirector} Music Director`);
    // Writer
    if (writer) kw.push(writer, `${writer} Writer`);
    // DOP
    if (dop) kw.push(dop, `${dop} Cinematographer`);
    // Editor
    if (editor) kw.push(editor, `${editor} Editor`);
    // Genre
    genreArr.forEach(g => kw.push(`${g} Odia Movie`, `Odia ${g} Film`));
    // General Ollywood keywords
    kw.push(
      "Odia Movie Collection", "Odia Movie Details", "Odia Movie Cast",
      "Odia Movie Review", "Odia Movie Trailer", "Odia Movie Release Date",
      "Odia Movie Box Office", "Odia Box Office Collection",
      "Ollywood Box Office Collection", "Ollywood Movie Collection",
      "Ollywood Movie Details", "Ollywood News",
      "Latest Odia Movie News", "Odia Cinema News", "Odia Film Industry",
      "Trending Odia Movie", year ? `New Odia Movie ${year}` : "New Odia Movie",
      "Best Odia Movies", "Ollywood Updates",
    );
    return kw.filter(Boolean).join(",\n");
  };

  return `<!-- ═══ SEO META ═══
  title: ${movieName} Box Office Collection Day ${targetDay}${year ? ` (${year})` : ""} | Total Net, Gross Collection | Ollypedia
  description: ${movieName} Box Office Collection Day ${targetDay}: Net ${totalNetStr}, Gross ${totalGrossStr}. Day-wise report, audience response & analysis.
  keywords: ${buildKeywords()}
  og:title: ${movieName} Box Office Collection Day ${targetDay}
  og:description: ${movieName} has collected ${totalGrossStr} gross after ${targetDay} days in theatres.
  schema:Movie: {"name":"${movieName}","datePublished":"${releaseDate}","inLanguage":"Odia","genre":"${genre}"}
  schema:NewsArticle: {"headline":"${movieName} Box Office Collection Day ${targetDay}","datePublished":"${new Date().toISOString().slice(0,10)}"}
═══ END SEO META ═══ -->

<!-- ── Movie Details ── -->
<section style="${S.section}">
  <h2 style="${S.h2}">— ${movieName} Movie Details</h2>
  <table style="${S.tbl}">
    <tr><td style="${S.tdLabel}">Movie Name</td><td style="${S.tdValue}">${movieName}</td></tr>
    <tr><td style="${S.tdLabel}">Language</td><td style="${S.tdValue}">Odia</td></tr>
    <tr><td style="${S.tdLabel}">Industry</td><td style="${S.tdValue}">Ollywood</td></tr>
    <tr><td style="${S.tdLabel}">Genre</td><td style="${S.tdValue}">${genre}</td></tr>
    ${releaseDate ? `<tr><td style="${S.tdLabel}">Release Date</td><td style="${S.tdValue}">${releaseDate}</td></tr>` : ""}
    ${directorName  ? `<tr><td style="${S.tdLabel}">Director</td><td style="${S.tdValue}">${directorName}</td></tr>` : ""}
    ${producerName  ? `<tr><td style="${S.tdLabel}">Producer</td><td style="${S.tdValue}">${producerName}</td></tr>` : ""}
    ${musicDirector ? `<tr><td style="${S.tdLabel}">Music Director</td><td style="${S.tdValue}">${musicDirector}</td></tr>` : ""}
    ${writer        ? `<tr><td style="${S.tdLabel}">Writer</td><td style="${S.tdValue}">${writer}</td></tr>` : ""}
    ${dop           ? `<tr><td style="${S.tdLabel}">Cinematographer</td><td style="${S.tdValue}">${dop}</td></tr>` : ""}
    ${editor        ? `<tr><td style="${S.tdLabel}">Editor</td><td style="${S.tdValue}">${editor}</td></tr>` : ""}
    ${leadActors.length ? `<tr><td style="${S.tdLabel}">Cast</td><td style="${S.tdValue}">${leadActors.join(", ")}</td></tr>` : ""}
    <tr><td style="${S.tdLabel}">Total Net Collection</td><td style="padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#c9973a;font-weight:800;font-size:1.05rem;">${totalNetStr}</td></tr>
    <tr><td style="${S.tdLabel}">Total Gross Collection</td><td style="padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#7ec8e3;font-weight:800;font-size:1.05rem;">${totalGrossStr}</td></tr>
  </table>
  <div style="text-align:center;margin-top:22px;">
    <a href="${boxOfficeUrl}" style="${S.btn}">🎬 View Latest Collection Updates</a>
  </div>
</section>

<!-- ── Hero ── -->
<div style="${S.hero}">
  <h1 style="color:#fff;font-size:1.45rem;line-height:1.35;font-weight:800;margin:0 0 14px;">${movieName} Box Office Collection Day ${targetDay}: ${sections.seoHeadline}</h1>
  <p style="${S.p}">${sections.introParagraph}</p>
  <p style="${S.p}">According to trade estimates, the film has collected approximately <strong style="color:#c9973a;">${totalNetStr} Net</strong> and <strong style="color:#7ec8e3;">${totalGrossStr} Gross</strong> over ${targetDay} days in theatres.</p>
</div>

<!-- ── Highlight box ── -->
<div style="${S.highlight}">
  <strong style="color:#ff9800;">📊 Box Office Update:</strong>
  <span style="color:#ddd;"> ${movieName} has collected an estimated <strong style="color:#c9973a;">${totalNetStr} net</strong> and <strong style="color:#7ec8e3;">${totalGrossStr} gross</strong> after ${targetDay} days in theatres.</span>
</div>

<!-- ── Day N Collection Report ── -->
<section style="${S.section}">
  <h2 style="${S.h2}">— ${movieName} Day ${targetDay} Collection Report</h2>
  <table style="${S.tbl}">
    <thead>
      <tr>
        <th style="${S.th}">Metric</th>
        <th style="${S.th}">Collection</th>
      </tr>
    </thead>
    <tbody>
      <tr><td style="${S.tdLabel}">Day ${targetDay} Net Collection</td><td style="padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#c9973a;font-weight:700;">${dayNet}</td></tr>
      <tr><td style="${S.tdLabel}">Day ${targetDay} Gross Collection</td><td style="padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#7ec8e3;font-weight:700;">${dayGross}</td></tr>
      <tr><td style="${S.tdLabel}">Total Net Collection</td><td style="padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#c9973a;font-weight:800;font-size:1.05rem;">${totalNetStr}</td></tr>
      <tr><td style="${S.tdLabel}">Total Gross Collection</td><td style="padding:11px 14px;border-bottom:1px solid #2e2e2e;color:#7ec8e3;font-weight:800;font-size:1.05rem;">${totalGrossStr}</td></tr>
    </tbody>
  </table>
</section>

<!-- ── Day-wise Breakdown ── -->
<section style="${S.section}">
  <h2 style="${S.h2}">— ${movieName} Day-wise Box Office Collection</h2>
  <div style="overflow-x:auto;">
    <table style="${S.tbl}">
      <thead>
        <tr>
          <th style="${S.th}">Day</th>
          <th style="${S.th}">Net Collection</th>
          <th style="${S.th}">Gross Collection</th>
          <th style="${S.th}">Notes</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
      <tfoot>
        <tr>
          <td style="${S.tfootTd}">Total (${sorted.length} day${sorted.length !== 1 ? "s" : ""})</td>
          <td style="${S.tfootTd}">${totalNetStr}</td>
          <td style="${S.tfootGross}">${totalGrossStr}</td>
          <td style="padding:12px 14px;background:#252008;border-top:2px solid #c9973a;"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>

<!-- ── Box Office Journey ── -->
<section style="${S.section}">
  <h2 style="${S.h2}">— Box Office Journey</h2>
  ${pWrap(sections.boxOfficeAnalysis)}
</section>

<!-- ── Audience Response ── -->
<section style="${S.section}">
  <h2 style="${S.h2}">— Audience Response</h2>
  ${pWrap(sections.audienceResponse)}
</section>

<!-- ── Performance Analysis ── -->
<section style="${S.section}">
  <h2 style="${S.h2}">— Performance Analysis</h2>
  ${pWrap(sections.performanceAnalysis)}
</section>

<!-- ── Future Box Office Prediction ── -->
<section style="${S.section}">
  <h2 style="${S.h2}">— Future Box Office Prediction</h2>
  ${pWrap(sections.prediction)}
</section>

<!-- ── Final Verdict ── -->
<section style="${S.section}">
  <h2 style="${S.h2}">— Final Verdict</h2>
  ${pWrap(sections.finalVerdict)}
</section>

<!-- ── Tags ── -->
<section style="background:#111;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
  <h2 style="${S.h2}">— Tags</h2>
  <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">
    ${tags.map(t => `<span style="${S.tag}">${t}</span>`).join("\n    ")}
  </div>
</section>

<!-- ── Footer ── -->
<div style="border-top:1px solid #2a2a2a;padding-top:18px;margin-top:8px;">
  <p style="color:#666;font-size:0.82rem;line-height:1.7;margin:0;">
    <strong style="color:#888;">Source:</strong> Ollypedia Box Office Tracking &nbsp;·&nbsp;
    <strong style="color:#888;">Last Updated:</strong> Day ${targetDay} &nbsp;·&nbsp;
    <em>All collection figures are industry estimates and may vary from official figures.</em>
  </p>
</div>`;
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

  const [showAi,     setShowAi]    = useState(false);
  const [aiPrompt,   setAiPrompt]  = useState("");
  const [aiText,     setAiText]    = useState("");
  const [aiSections, setAiSections] = useState(null); // parsed object, avoids re-parsing JSON
  const [aiStatus,   setAiStatus]  = useState(""); // ""|"loading"|"done"|"error"
  const [saving,       setSaving]       = useState(false);
  const [err,          setErr]          = useState("");
  const [grossManual,  setGrossManual]  = useState(!!dayData?.gross); // true = user typed gross manually

  const GST_RATE = 1.18; // Gross = Net × 1.18  (18% entertainment tax / GST)

  const set = (k) => (e) => {
    const val = e.target.value;
    if (k === "net") {
      // Auto-calculate gross unless the user has manually overridden it
      setForm((p) => {
        const netNum = parseFloat(val.replace(/[^0-9.]/g, ""));
        const autoGross = !isNaN(netNum) && netNum > 0
          ? String(Math.round(netNum * GST_RATE))
          : p.gross;
        return { ...p, net: val, gross: grossManual ? p.gross : autoGross };
      });
    } else if (k === "gross") {
      setGrossManual(val.trim() !== ""); // if user clears gross, allow auto again
      setForm((p) => ({ ...p, gross: val }));
    } else {
      setForm((p) => ({ ...p, [k]: val }));
    }
  };

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
    setAiSections(null);
    try {
      const token = getAdminToken();
      const res   = await fetch(`${BASE}/admin/generate-article`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ prompt: aiPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      const rawText = data.text || "";
      setAiText(rawText);
      // Parse ONCE right now — store clean object so textarea edits never touch JSON again
      const _days = getDaysUpToN();
      const _tN   = _days.reduce((s,d)=>s+parseNum(d.net),0);
      const _tG   = _days.reduce((s,d)=>s+parseNum(d.gross),0);
      setAiSections(parseAiSections(rawText, movie, parseInt(form.day,10), _tN, _tG));
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
        const parsedSecs = aiSections || parseAiSections(aiText, movie, targetDay, totalNet, totalGross);
        const content    = buildBlogContent(movie, daysUpToN, totalNet, totalGross, targetDay, parsedSecs);
        const excerpt    = parsedSecs.introParagraph ||
          `${blogTitle}: Net ${fmtINR(payload.net || 0)}, Gross ${fmtINR(payload.gross || 0)}. Total ${fmtINR(totalNet)} net in ${daysUpToN.length} days.`;
        const seoTitle   = `${movie.title}${year ? ` (${year})` : ""} Box Office Collection Day ${targetDay} | Total Net, Gross | Ollypedia`;
        const seoDesc    = `${movie.title} Box Office Collection Day ${targetDay}: Net ${fmtINR(totalNet)}, Gross ${fmtINR(totalGross)}. Full day-wise report and analysis.`;

        const blogPayload = {
          title: blogTitle, slug: blogSlug, excerpt, content,
          category:   "Box Office",
          tags: [
            movie.title, "Box Office", "Odia Cinema", "Ollywood",
            `Day ${targetDay}`, year ? String(year) : null,
            ...parsedSecs && movie.cast
              ? (() => {
                  const ci = extractCastInfo(movie);
                  return [
                    ci.directorName, ci.producerName, ci.musicDirector,
                    ...ci.leadActors, ...ci.leadActresses,
                  ].filter(Boolean);
                })()
              : [],
          ].filter(Boolean),
          coverImage: movie.bannerUrl || movie.posterUrl || "",
          movieId:    movie._id, movieTitle: movie.title,
          published:  true, featured: false,
          seoTitle,
          seoDesc,
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
              <div style={{ fontSize: "0.65rem", color: "var(--muted)", marginTop: 4 }}>
                Gross auto-calculates at Net × 1.18 (18% GST)
              </div>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                <label style={{ ...lbl, marginBottom: 0 }}>Gross Collection (₹)</label>
                {grossManual && (
                  <button
                    type="button"
                    onClick={() => {
                      setGrossManual(false);
                      const netNum = parseFloat(form.net.replace(/[^0-9.]/g, ""));
                      const autoGross = !isNaN(netNum) && netNum > 0 ? String(Math.round(netNum * GST_RATE)) : "";
                      setForm((p) => ({ ...p, gross: autoGross }));
                    }}
                    style={{ fontSize: "0.6rem", color: "var(--gold)", background: "rgba(201,151,58,0.12)", border: "1px solid rgba(201,151,58,0.3)", borderRadius: 6, padding: "2px 7px", cursor: "pointer", fontWeight: 700 }}
                  >
                    ↺ Auto
                  </button>
                )}
              </div>
              <input className="form-input" style={{ width: "100%", boxSizing: "border-box", borderColor: grossManual ? "rgba(201,151,58,0.5)" : undefined }}
                type="text" placeholder="Auto-filled from Net"
                value={form.gross} onChange={set("gross")} />
              <div style={{ fontSize: "0.65rem", marginTop: 4, color: grossManual ? "var(--gold)" : "var(--muted)" }}>
                {grossManual ? "✏️ Manual override — click ↺ Auto to recalculate" : "✅ Auto-calculated from Net"}
              </div>
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

              {aiStatus === "done" && aiSections && (() => {
                const SECTION_META = [
                  { label: "SEO Headline",         key: "seoHeadline",         rows: 1 },
                  { label: "Intro Paragraph",      key: "introParagraph",      rows: 3 },
                  { label: "Box Office Journey",   key: "boxOfficeAnalysis",   rows: 5 },
                  { label: "Audience Response",    key: "audienceResponse",    rows: 4 },
                  { label: "Performance Analysis", key: "performanceAnalysis", rows: 4 },
                  { label: "Future Prediction",    key: "prediction",          rows: 3 },
                  { label: "Final Verdict",        key: "finalVerdict",        rows: 3 },
                ];
                return (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: "0.72rem", color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>
                      ✅ Generated — Edit any section below before saving
                    </div>
                    {SECTION_META.map(({ label, key, rows }) => (
                      <div key={key} style={{ marginBottom: 14 }}>
                        <label style={{ display: "block", fontSize: "0.68rem", color: "var(--muted)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
                        <textarea
                          className="form-input"
                          value={aiSections[key] || ""}
                          onChange={(e) => setAiSections((prev) => ({ ...prev, [key]: e.target.value }))}
                          rows={rows}
                          style={{ width: "100%", boxSizing: "border-box", fontSize: "0.77rem", lineHeight: 1.7, resize: "vertical" }}
                        />
                      </div>
                    ))}
                    <div style={{ fontSize: "0.68rem", color: "var(--muted)", marginTop: 4, lineHeight: 1.6 }}>
                      ✏️ Edit any section above. Blog publishes with full SEO, schema, hero, day-wise table &amp; all sections.
                    </div>
                  </div>
                );
              })()}
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