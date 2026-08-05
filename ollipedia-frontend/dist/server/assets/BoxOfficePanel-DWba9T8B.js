import { jsxs, jsx, Fragment } from "react/jsx-runtime";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { A as API, g as getAdminToken } from "../entry-server.js";
import "react-dom/server";
import "react-router-dom/server.mjs";
import "react-helmet-async";
import "react-router-dom";
const BASE = "http://localhost:4000/api";
const parseToRupees = (str) => {
  if (!str && str !== 0) return 0;
  const s = String(str).replace(/[₹,\s]/g, "").toLowerCase();
  const n = parseFloat(s);
  if (isNaN(n)) return 0;
  if (s.includes("cr") || s.includes("crore")) return Math.round(n * 1e7);
  if (s.includes("l") || s.includes("lakh")) return Math.round(n * 1e5);
  if (n >= 1e3) return Math.round(n);
  return 0;
};
const fmtINR = (val) => {
  if (val === void 0 || val === null || val === "") return "—";
  const n = typeof val === "number" ? val : parseToRupees(val);
  if (!n || isNaN(n)) return val || "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString("en-IN")}`;
};
const parseNum = parseToRupees;
const GST_RATE = 1.18;
const addDaysToISO = (releaseDate, dayNum) => {
  if (!releaseDate) return "";
  const d = new Date(releaseDate);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + (Number(dayNum) - 1));
  return d.toISOString().slice(0, 10);
};
const buildBoxOfficeTemplateCSV = (movie, startDay, count) => {
  const rows = [["Day", "Date (reference only — recalculated on upload)", "Net Collection"]];
  for (let i = 0; i < count; i++) {
    const day = startDay + i;
    const date = addDaysToISO(movie == null ? void 0 : movie.releaseDate, day);
    rows.push([`Day ${day}`, date || "TBA", ""]);
  }
  return rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
};
const downloadCSV = (csvText, filename) => {
  const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
const parseCSVText = (text) => {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") pushField();
      else if (c === "\r") ;
      else if (c === "\n") pushRow();
      else field += c;
    }
  }
  if (field.length || row.length) pushRow();
  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
};
const extractDayNumber = (s) => {
  const m = String(s ?? "").match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
};
const parseBulkCSVRows = (rows) => {
  if (!rows.length) return [];
  const header = rows[0].map((h) => String(h).toLowerCase());
  let dayIdx = header.findIndex((h) => h.includes("day"));
  let netIdx = header.findIndex((h) => h.includes("net"));
  if (dayIdx === -1) dayIdx = 0;
  if (netIdx === -1) netIdx = header.length - 1;
  return rows.slice(1).map((r) => ({ day: extractDayNumber(r[dayIdx]), netRaw: String(r[netIdx] ?? "").trim() })).filter((r) => r.day && r.netRaw);
};
const parseBulkPasteText = (text) => {
  return String(text || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const day = extractDayNumber(line);
    if (!day) return null;
    const netRaw = line.replace(/^\s*day\s*-?\s*\d+\s*/i, "").replace(/^\d+\s*/, "").replace(/^[\s,:\-\t]+/, "").trim();
    return netRaw ? { day, netRaw } : null;
  }).filter(Boolean);
};
const slugify = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
const getYear = (releaseDate) => releaseDate ? new Date(releaseDate).getFullYear() : "";
const extractCastInfo = (movie) => {
  const cast = Array.isArray(movie.cast) ? movie.cast : [];
  const findByRole = (keywords) => {
    var _a;
    return ((_a = cast.find((m) => {
      const r = (m.role || m.type || "").toLowerCase();
      return keywords.some((k) => r.includes(k));
    })) == null ? void 0 : _a.name) || null;
  };
  const directorEntry = cast.find((m) => {
    const r = (m.role || m.type || "").toLowerCase().trim();
    return r === "director" || r === "film director" || r === "movie director" || r.includes("director") && !["music", "art", "action", "stunt", "assistant", "co-", "associate"].some((x) => r.includes(x));
  });
  const directorName = (directorEntry == null ? void 0 : directorEntry.name) || movie.director || null;
  const producerEntry = cast.find((m) => {
    const r = (m.role || m.type || "").toLowerCase().trim();
    return r === "producer" || r.includes("producer") && !["executive", "co-", "line", "associate", "assistant"].some((x) => r.includes(x));
  });
  const producerName = (producerEntry == null ? void 0 : producerEntry.name) || movie.producer || null;
  const musicDirector = findByRole(["music director"]) || null;
  const writer = findByRole(["writer", "screenplay", "story", "dialogue"]) || null;
  const dop = findByRole(["cinematographer", "dop", "director of photography"]) || null;
  const editor = findByRole(["editor"]) || null;
  const CREW_KW = ["director", "producer", "writer", "screenplay", "story", "dialogue", "music director", "cinematographer", "dop", "editor", "choreographer", "art director", "costume", "sound", "stunt", "vfx"];
  const actingKW = ["actor", "actress", "lead", "hero", "heroine", "supporting", "cameo", "special appearance"];
  const actors = cast.filter((m) => {
    const r = (m.role || m.type || "").toLowerCase();
    const isCrew = CREW_KW.some((k) => r.includes(k)) && !actingKW.some((k) => r.includes(k));
    return !isCrew;
  });
  const leadActors = actors.slice(0, 4).map((m) => m.name).filter(Boolean);
  const leadActresses = actors.filter((m) => {
    const r = (m.role || m.type || "").toLowerCase();
    return r.includes("actress") || r.includes("heroine");
  }).slice(0, 2).map((m) => m.name).filter(Boolean);
  return { directorName, producerName, musicDirector, writer, dop, editor, leadActors, leadActresses };
};
const classifyBoxOfficeDayType = (targetDay, daysUpToN, totalNet, movie) => {
  const sorted = [...daysUpToN || []].sort((a, b) => a.day - b.day);
  const todayEntry = sorted.find((d) => d.day === targetDay);
  const dateStr = (todayEntry == null ? void 0 : todayEntry.date) || "";
  const prevTotalNetNum = sorted.filter((d) => d.day < targetDay).reduce((s, d) => s + (parseNum(d.net) || 0), 0);
  const tags = [];
  const dow = dateStr ? new Date(dateStr).getDay() : null;
  const isWeekend = dow === 0 || dow === 5 || dow === 6;
  if (targetDay === 1) tags.push("opening-day");
  else if (targetDay === 2) tags.push("day-two");
  else if (targetDay === 3) tags.push("day-three");
  else if (targetDay === 7) tags.push("first-week-closing");
  else if (targetDay === 10) tags.push("day-ten");
  else if (targetDay === 15) tags.push("day-fifteen");
  if (targetDay > 3) tags.push(isWeekend ? "weekend" : "weekday");
  const MILESTONES_CR = [1, 2, 3, 5, 10, 15, 20, 25, 35, 50, 75, 100, 150, 200];
  const crossed = MILESTONES_CR.find((cr) => {
    const r = cr * 1e7;
    return prevTotalNetNum < r && (totalNet || 0) >= r;
  }) || null;
  if (crossed) tags.push(`milestone-${crossed}cr`);
  if ((movie == null ? void 0 : movie.ottReleaseDate) && dateStr) {
    const ottD = new Date(movie.ottReleaseDate);
    const curD = new Date(dateStr);
    if (!isNaN(ottD.getTime())) {
      const diffDays = Math.round((ottD - curD) / (1e3 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 7) tags.push("approaching-ott");
      if (diffDays < 0) tags.push("post-ott-theatrical");
    }
  }
  if (targetDay >= 25) tags.push("extended-run");
  if (!tags.length) tags.push("standard-day");
  return { tags, isWeekend, milestoneCroreCrossed: crossed };
};
const buildAiPrompt = (movie, daysUpToN, totalNet, totalGross, targetDay) => {
  const year = getYear(movie.releaseDate);
  const sorted = [...daysUpToN].sort((a, b) => a.day - b.day);
  const tableText = sorted.map((d) => `Day ${d.day}${d.date ? ` (${d.date})` : ""}: Net ${fmtINR(d.net)}, Gross ${fmtINR(d.gross)}${d.note ? ` — ${d.note}` : ""}`).join("\n");
  const ci = extractCastInfo(movie);
  const castLine = [
    ci.directorName ? `Director: ${ci.directorName}` : "",
    ci.producerName ? `Producer: ${ci.producerName}` : "",
    ci.musicDirector ? `Music Director: ${ci.musicDirector}` : "",
    ci.writer ? `Writer: ${ci.writer}` : "",
    ci.leadActors.length ? `Cast: ${ci.leadActors.join(", ")}` : "",
    ci.leadActresses.length ? `Actresses: ${ci.leadActresses.join(", ")}` : ""
  ].filter(Boolean).join("\n");
  const dayClass = classifyBoxOfficeDayType(targetDay, daysUpToN, totalNet, movie);
  const dayTags = dayClass.tags;
  const dayTagLine = dayTags.join(", ");
  return `You are writing a box office collection article for the Odia film website Ollypedia.

Movie: ${movie.title}${year ? ` (${year})` : ""}
${movie.language ? `Language: ${movie.language}` : "Language: Odia"}
Genre: ${Array.isArray(movie.genre) ? movie.genre.join(", ") : movie.genre || "Drama"}
Release Date: ${movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : ""}
${castLine}
${movie.budget ? `Budget: ${movie.budget}` : ""}

Day-wise collection data (all days up to Day ${targetDay}):
${tableText}

Total Net: ${fmtINR(totalNet)}
Total Gross: ${fmtINR(totalGross)}

CONTEXT FOR TODAY (Day ${targetDay}): ${dayTagLine}.
${dayTags.includes("opening-day") ? "This is the FILM'S OPENING DAY — focus on first impressions, opening-day buzz, and how it compares to expectations going in." : ""}
${dayTags.includes("weekend") ? "Today falls in the WEEKEND box-office window — focus heavily on weekend vs weekday performance and family/leisure footfalls." : ""}
${dayTags.includes("weekday") ? "Today is a WEEKDAY — focus on how the film is holding up after the opening rush and what weekday collections reveal about word-of-mouth." : ""}
${dayTags.includes("first-week-closing") ? "Today marks the close of WEEK ONE — focus on the overall week-one verdict and what it signals for week two." : ""}
${dayTags.some((t) => t.startsWith("milestone-")) ? `The film has just CROSSED A COLLECTION MILESTONE today (${dayTags.find((t) => t.startsWith("milestone-"))}) — lead with this milestone and what it means for the film's standing in Ollywood.` : ""}
${dayTags.includes("approaching-ott") ? "The film's OTT release is approaching within the next week — mention how the theatrical run is winding down ahead of the digital premiere." : ""}
${dayTags.includes("extended-run") ? "The film is in an EXTENDED THEATRICAL RUN (25+ days) — focus on staying power, repeat audiences, and longevity rather than day-on-day swings." : ""}

You must respond ONLY with a valid JSON object (no markdown, no code fences, no extra text). The JSON must have exactly these keys:

{
  "seoHeadline": "A compelling 10-15 word headline for the h1 tag, reflecting today's specific context above (not a generic 'Day N collection' phrase)",
  "introParagraph": "2-3 sentences introducing the film and Day ${targetDay} performance. Mention the net and gross figures naturally, and reflect today's context.",
  "boxOfficeAnalysis": "2-3 paragraphs (plain text, no HTML tags) covering the day-wise journey and trend, written specifically through today's context above — do NOT just restate yesterday's analysis with new numbers.",
  "audienceResponse": "1-2 paragraphs about how Odia audiences and reviewers are responding — word of mouth, social media buzz, repeat viewing. Vary the framing based on how many days the film has run.",
  "performanceAnalysis": "2 paragraphs analysing the film's performance relative to its budget and typical Odia cinema benchmarks. Mention total net ${fmtINR(totalNet)} and gross ${fmtINR(totalGross)}.",
  "weekendWeekdayComparison": "1-2 paragraphs specifically comparing weekend and weekday collection patterns for this film so far, and what that pattern suggests about audience type (family/youth/repeat viewers).",
  "occupancyTrend": "1 paragraph describing the likely occupancy trend (rising, falling, steady) across screens based on the collection numbers — do not invent exact percentages, describe the trend qualitatively.",
  "prediction": "1-2 paragraphs predicting upcoming weekend/week performance based on current trend.",
  "industryImpact": "1 paragraph on what this film's performance means for the wider Ollywood (Odia film industry) — e.g. theatre footfalls, confidence in the genre, impact on upcoming Odia releases.",
  "futureOutlook": "1-2 paragraphs on the film's likely box office path from here — upcoming milestones, competition from other releases, or OTT timing if relevant.",
  "finalVerdict": "2-3 sentences summarising the film's box office status after Day ${targetDay}. Do NOT use words like Hit, Flop, Average, Super-Hit — just describe the collection factually."
}

Rules:
- All values must be plain text only — no HTML, no bullet points, no markdown
- Write for an Odia cinema (Ollywood) audience
- Keep each section concise but informative
- Make this article meaningfully different from a generic "Day N" template — lean into today's specific context listed above
- Do not invent or fabricate collection figures — only use the data provided above`;
};
const parseAiSections = (aiText, movie, targetDay, totalNet, totalGross, daysUpToN = []) => {
  var _a;
  const year = getYear(movie.releaseDate);
  const dayClass = classifyBoxOfficeDayType(targetDay, daysUpToN, totalNet, movie);
  const tagSet = new Set(dayClass.tags);
  const isWeekendDay = tagSet.has("weekend");
  const milestoneCr = (_a = [...tagSet].find((t) => t.startsWith("milestone-"))) == null ? void 0 : _a.replace("milestone-", "").replace("cr", "");
  const fallback = (key) => {
    const defaults = {
      seoHeadline: `${movie.title}${year ? ` (${year})` : ""} Day ${targetDay} Box Office Collection Report`,
      introParagraph: `${movie.title}${year ? ` (${year})` : ""} continues its theatrical run. On Day ${targetDay}, the film has collected a total net of ${fmtINR(totalNet)} and gross of ${fmtINR(totalGross)} at the Odia box office.`,
      boxOfficeAnalysis: tagSet.has("opening-day") ? `${movie.title} opened in theatres across Odisha with this Day 1 collection setting the baseline for the film's theatrical run.` : tagSet.has("first-week-closing") ? `${movie.title} has now completed its first full week in theatres, with a week-one tally of ${fmtINR(totalNet)} net.` : isWeekendDay ? `${movie.title} is riding the weekend box office window on Day ${targetDay}, typically a period of higher footfalls than weekdays.` : `${movie.title} has shown a steady run at the box office on Day ${targetDay}, a regular weekday in its theatrical journey.`,
      audienceResponse: `Audiences across Odisha have given ${movie.title} a warm response. The film continues to attract viewers with positive word of mouth${tagSet.has("extended-run") ? ", helping it sustain a long theatrical run" : ""}.`,
      performanceAnalysis: `With a total net collection of ${fmtINR(totalNet)} and gross of ${fmtINR(totalGross)}, ${movie.title} has delivered a notable performance for Odia cinema.`,
      weekendWeekdayComparison: isWeekendDay ? `Day ${targetDay} falls within the weekend box office window, when Odia films typically see higher occupancy than weekdays.` : `Day ${targetDay} is a weekday for ${movie.title}, and weekday collections are usually lower than the opening weekend.`,
      occupancyTrend: `Occupancy levels for ${movie.title} on Day ${targetDay} are estimated based on trade trends for similarly positioned Odia releases${isWeekendDay ? ", with weekend shows typically running fuller" : ", with weekday shows generally running at moderate occupancy"}.`,
      prediction: `Based on current trends, ${movie.title} is expected to maintain momentum in the coming days, especially during weekends.`,
      industryImpact: `${movie.title}'s box office run is being closely watched within Ollywood as a marker of audience appetite for this genre of Odia cinema.`,
      futureOutlook: milestoneCr ? `Having just crossed the ₹${milestoneCr} Cr mark, ${movie.title} enters its next phase of theatrical run with a fresh milestone to build on.` : `Looking ahead, ${movie.title}'s box office trajectory will depend on how it performs through the next weekend.`,
      finalVerdict: `${movie.title} has collected ${fmtINR(totalNet)} net and ${fmtINR(totalGross)} gross after ${targetDay} days. All figures are industry estimates. Source: Ollypedia.`
    };
    return defaults[key] || "";
  };
  const keys = [
    "seoHeadline",
    "introParagraph",
    "boxOfficeAnalysis",
    "audienceResponse",
    "performanceAnalysis",
    "weekendWeekdayComparison",
    "occupancyTrend",
    "prediction",
    "industryImpact",
    "futureOutlook",
    "finalVerdict"
  ];
  if (!(aiText == null ? void 0 : aiText.trim())) {
    return Object.fromEntries(keys.map((k) => [k, fallback(k)]));
  }
  try {
    const clean = aiText.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(clean);
    return Object.fromEntries(keys.map((k) => [k, parsed[k] || fallback(k)]));
  } catch {
    return {
      seoHeadline: fallback("seoHeadline"),
      introParagraph: fallback("introParagraph"),
      boxOfficeAnalysis: aiText.trim(),
      audienceResponse: fallback("audienceResponse"),
      performanceAnalysis: fallback("performanceAnalysis"),
      weekendWeekdayComparison: fallback("weekendWeekdayComparison"),
      occupancyTrend: fallback("occupancyTrend"),
      prediction: fallback("prediction"),
      industryImpact: fallback("industryImpact"),
      futureOutlook: fallback("futureOutlook"),
      finalVerdict: fallback("finalVerdict")
    };
  }
};
const toParagraphs = (text) => String(text || "").replace(/`/g, "&#96;").trim().split(/\n{2,}/).map((chunk) => chunk.split(/\n/).map((l) => l.trim()).filter(Boolean).join(" ").trim()).filter(Boolean).map((p) => `<p>${p}</p>`).join("\n");
const buildReReleaseBlogContent = (movie, daysUpToN, totalNet, totalGross, targetDay, sectionsOrRaw, blogSlug) => {
  const year = getYear(movie.releaseDate);
  const sorted = [...daysUpToN].sort((a, b) => a.day - b.day);
  const sections = sectionsOrRaw && typeof sectionsOrRaw === "object" && "seoHeadline" in sectionsOrRaw ? sectionsOrRaw : parseAiSections(sectionsOrRaw, movie, targetDay, totalNet, totalGross, daysUpToN);
  const movieName = `${movie.title || "Unknown Movie"} (Re-Release)`;
  const boxOfficeUrl = `/box-office/${slugify(`${movie.title}${year ? ` (${year})` : ""}`)}`;
  const totalNetStr = fmtINR(totalNet);
  const totalGrossStr = fmtINR(totalGross);
  const pWrap = (text) => toParagraphs(text).replace(/<p>/g, `<p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">`);
  let cumulativeNet = 0;
  let cumulativeGross = 0;
  const dataTableRows = sorted.map((d, i) => {
    cumulativeNet += parseNum(d.net);
    cumulativeGross += parseNum(d.gross);
    const isToday = d.day === targetDay;
    const dateStr = d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
    return `
    <tr style="background:${isToday ? "rgba(201,151,58,0.05)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)"};">
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${isToday ? "#c9973a" : "#aaa"};font-weight:700;white-space:nowrap;">
        Day ${d.day}
      </td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.82rem;">${dateStr}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${isToday ? "#c9973a" : "#ddd"};font-weight:700;">${d.net ? fmtINR(d.net) : "—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${isToday ? "#7ec8e3" : "#7ec8e3"};font-weight:700;">${d.gross ? fmtINR(d.gross) : "—"}</td>
    </tr>`;
  }).join("");
  return `
<!-- RE-RELEASE EXCLUSIVE TEMPLATE -->
<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    ${movieName} Box Office - Day ${targetDay}
  </h2>
  <p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">
    The much-awaited re-release of <strong>${movie.title}</strong> is seeing renewed interest at the box office. 
    By Day ${targetDay}, the re-release has grossed a total of <strong>${totalGrossStr}</strong> and netted <strong>${totalNetStr}</strong>, proving that true cinematic classics never fade.
  </p>
  ${pWrap(sections.boxOfficeAnalysis)}
  ${pWrap(sections.performanceAnalysis)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Re-Release Day-wise Breakdown
  </h2>
  <div style="overflow-x:auto;">
    <table style="width:100%;border-collapse:collapse;font-size:0.88rem;min-width:400px;">
      <thead>
        <tr>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Day</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Date</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Net</th>
          <th style="padding:12px 14px;background:#1a1a1a;color:#888;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.07em;text-align:left;border-bottom:2px solid #242424;">Gross</th>
        </tr>
      </thead>
      <tbody>
        ${dataTableRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;">
            TOTAL RE-RELEASE (${sorted.length} days)
          </td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${totalNetStr}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#7ec8e3;font-weight:800;font-size:1rem;">${totalGrossStr}</td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Nostalgia & Audience Response
  </h2>
  ${pWrap(sections.audienceResponse)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Occupancy Trends & Weekend Growth
  </h2>
  ${pWrap(sections.occupancyTrend)}
  ${pWrap(sections.weekendWeekdayComparison)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Re-Release Impact & Legacy
  </h2>
  ${pWrap(sections.industryImpact)}
</section>

<section style="background:#151515;border:1px solid #2a2a2a;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.15rem;font-weight:800;color:#c9973a;border-left:4px solid #c9973a;padding-left:12px;margin:0 0 18px;line-height:1.3;">
    Future Outlook & Verdict
  </h2>
  ${pWrap(sections.prediction)}
  ${pWrap(sections.futureOutlook)}
  <div style="border-left:4px solid #c9973a;padding-left:16px;margin-top:16px;">
    ${pWrap(sections.finalVerdict)}
  </div>
  <div style="text-align:center;margin-top:22px;">
    <a href="${boxOfficeUrl}" class="cta-btn" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:0.93rem;">
      🎬 View Latest Re-Release Box Office Updates
    </a>
  </div>
</section>
  `;
};
const buildBlogContent = (movie, daysUpToN, totalNet, totalGross, targetDay, sectionsOrRaw, blogSlug, trackType = "original") => {
  if (trackType === "re-release") {
    return buildReReleaseBlogContent(movie, daysUpToN, totalNet, totalGross, targetDay, sectionsOrRaw);
  }
  const year = getYear(movie.releaseDate);
  const sorted = [...daysUpToN].sort((a, b) => a.day - b.day);
  const sections = sectionsOrRaw && typeof sectionsOrRaw === "object" && "seoHeadline" in sectionsOrRaw ? sectionsOrRaw : parseAiSections(sectionsOrRaw, movie, targetDay, totalNet, totalGross, daysUpToN);
  const movieName = movie.title || "Unknown Movie";
  const movieNameNoSpace = movieName.replace(/\s+/g, "");
  const releaseDate = movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
  const genreArr = Array.isArray(movie.genre) ? movie.genre : movie.genre ? [movie.genre] : [];
  const genre = genreArr.join(", ") || "Drama";
  const movieSlug = slugify(`${movieName}${year ? ` (${year})` : ""}`);
  const boxOfficeUrl = `/box-office/${movieSlug}`;
  const crew = extractCastInfo(movie);
  const { directorName, producerName, musicDirector, writer, dop, editor, leadActors, leadActresses } = crew;
  const currentDay = sorted.find((d) => d.day === targetDay) || sorted[sorted.length - 1] || {};
  const dayNet = currentDay.net ? fmtINR(currentDay.net) : "—";
  const dayGross = currentDay.gross ? fmtINR(currentDay.gross) : "—";
  const totalNetStr = fmtINR(totalNet);
  const totalGrossStr = fmtINR(totalGross);
  const pWrap = (text) => toParagraphs(text).replace(/<p>/g, `<p style="color:#ccc;line-height:1.9;margin:0 0 16px;font-size:0.97rem;">`);
  const buildKeywordsArr = () => {
    const kw = [];
    kw.push(
      `${movieName} Odia Movie`,
      `${movieName} Movie Details`,
      `${movieName} Cast`,
      `${movieName} Cast and Crew`,
      `${movieName} Story`,
      `${movieName} Review`,
      `${movieName} Trailer`,
      `${movieName} Teaser`,
      `${movieName} Songs`,
      `${movieName} Music`,
      `${movieName} Release Date`
    );
    kw.push(
      `${movieName} Box Office Collection`,
      `${movieName} Day ${targetDay} Collection`,
      `${movieName} Day ${targetDay} Box Office Collection`,
      `${movieName} Total Collection`,
      `${movieName} Total Box Office Collection`,
      `${movieName} Gross Collection`,
      `${movieName} Net Collection`,
      `${movieName} Opening Day Collection`,
      `${movieName} First Day Collection`,
      `${movieName} Week 1 Collection`,
      `${movieName} Box Office Report`,
      `${movieName} Box Office Prediction`,
      `${movieName} Worldwide Collection`,
      `${movieName} Audience Response`,
      `${movieName} Movie Update`,
      `${movieName} Latest News`,
      `${movieName} Movie Collection`,
      year ? `${movieName} (${year})` : null,
      year ? `${movieName} (${year}) Box Office Collection` : null,
      year ? `${movieName} (${year}) Total Collection` : null
    );
    if (directorName) {
      kw.push(
        directorName,
        `${directorName} Movie`,
        `${directorName} Odia Movie`,
        `${directorName} Director`
      );
    }
    if (producerName) {
      kw.push(
        producerName,
        `${producerName} Producer`
      );
    }
    leadActors.forEach((a) => kw.push(
      a,
      `${a} Movie`,
      `${a} Odia Movie`
    ));
    leadActresses.forEach((a) => kw.push(
      a,
      `${a} Movie`,
      `${a} Odia Movie`
    ));
    if (musicDirector) {
      kw.push(
        musicDirector,
        `${musicDirector} Music Director`
      );
    }
    if (writer) {
      kw.push(
        writer,
        `${writer} Writer`
      );
    }
    if (dop) {
      kw.push(
        dop,
        `${dop} Cinematographer`
      );
    }
    if (editor) {
      kw.push(
        editor,
        `${editor} Editor`
      );
    }
    genreArr.forEach((g) => kw.push(
      `${g} Odia Movie`,
      `Odia ${g} Film`
    ));
    kw.push(
      "Odia Movie Collection",
      "Odia Movie Details",
      "Odia Movie Cast",
      "Odia Movie Review",
      "Odia Movie Trailer",
      "Odia Movie Release Date",
      "Odia Movie Box Office",
      "Odia Box Office Collection",
      "Ollywood Box Office Collection",
      "Ollywood Movie Collection",
      "Ollywood Movie Details",
      "Ollywood News",
      "Latest Odia Movie News",
      "Odia Cinema News",
      "Odia Film Industry",
      "Trending Odia Movie",
      year ? `New Odia Movie ${year}` : "New Odia Movie",
      "Best Odia Movies",
      "Ollywood Updates"
    );
    return kw.filter(Boolean);
  };
  buildKeywordsArr();
  const tags = [
    `#${movieNameNoSpace}`,
    `#${movieNameNoSpace}Collection`,
    `#${movieNameNoSpace}BoxOffice`,
    `#${movieNameNoSpace}Day${targetDay}`,
    directorName ? `#${directorName.replace(/\s+/g, "")}` : null,
    producerName ? `#${producerName.replace(/\s+/g, "")}` : null,
    musicDirector ? `#${musicDirector.replace(/\s+/g, "")}` : null,
    ...leadActors.map((a) => `#${a.replace(/\s+/g, "")}`),
    ...leadActresses.map((a) => `#${a.replace(/\s+/g, "")}`),
    "#OdiaMovie",
    "#Ollywood",
    "#OdiaCinema",
    "#Ollypedia",
    "#BoxOfficeCollection",
    "#OllywoodBoxOffice",
    "#OllywoodNews",
    year ? `#OdiaMovie${year}` : null
  ].filter(Boolean);
  const infoRows = [
    ["Movie Name", movieName],
    ["Language", "Odia"],
    ["Industry", "Ollywood"],
    ["Genre", genre],
    releaseDate ? ["Release Date", releaseDate] : null,
    directorName ? ["Director", directorName] : null,
    producerName ? ["Producer", producerName] : null,
    musicDirector ? ["Music Director", musicDirector] : null,
    writer ? ["Writer", writer] : null,
    dop ? ["Cinematographer", dop] : null,
    editor ? ["Editor", editor] : null,
    leadActors.length ? ["Cast", leadActors.join(", ")] : null,
    leadActresses.length ? ["Actress", leadActresses.join(", ")] : null,
    movie.budget ? ["Budget", movie.budget] : null
  ].filter(Boolean);
  const maxNet = Math.max(
    ...sorted.map((d) => parseNum(d.net)),
    1
  );
  sorted.map((d, i) => {
    const netNum = parseNum(d.net);
    const grossNum = parseNum(d.gross);
    const pct = Math.round(netNum / maxNet * 100);
    const grossPct = grossNum > 0 ? Math.round(grossNum / maxNet * 100) : 0;
    const isToday = d.day === targetDay;
    const dateStr = d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";
    const dayLabel = `Day ${d.day}${d.day === 1 ? " (Opening)" : ""}`;
    const netColor = isToday ? "#c9973a" : i % 2 === 0 ? "#8a6fc4" : "#4a9fd4";
    const bgRow = isToday ? "rgba(201,151,58,0.06)" : "transparent";
    return `
    <tr style="background:${bgRow};">
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;min-width:72px;vertical-align:middle;">
        <div style="font-size:0.8rem;font-weight:700;color:${isToday ? "#c9973a" : "#aaa"};">${dayLabel}</div>
        ${dateStr ? `<div style="font-size:0.7rem;color:#555;">${dateStr}</div>` : ""}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;width:55%;">
        <div style="margin-bottom:5px;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
            <div style="font-size:0.65rem;color:#666;width:36px;flex-shrink:0;">Net</div>
            <div style="flex:1;background:#1a1a1a;border-radius:999px;height:7px;overflow:hidden;">
              <div style="width:${pct}%;height:100%;background:${netColor};border-radius:999px;transition:width 0.3s;"></div>
            </div>
            <div style="font-size:0.78rem;font-weight:700;color:${isToday ? "#c9973a" : "#ccc"};min-width:56px;text-align:right;word-break:break-word;">${d.net ? fmtINR(d.net) : "—"}</div>
          </div>
          ${grossNum > 0 ? `
          <div style="display:flex;align-items:center;gap:6px;">
            <div style="font-size:0.65rem;color:#666;width:36px;flex-shrink:0;">Gross</div>
            <div style="flex:1;background:#1a1a1a;border-radius:999px;height:5px;overflow:hidden;">
              <div style="width:${grossPct}%;height:100%;background:#3a6a8a;border-radius:999px;"></div>
            </div>
            <div style="font-size:0.72rem;color:#7ec8e3;min-width:56px;text-align:right;word-break:break-word;">${fmtINR(d.gross)}</div>
          </div>` : ""}
        </div>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #1e1e1e;vertical-align:middle;text-align:right;">
        ${d.note ? `<span style="display:inline-block;background:#1e1e1e;color:#777;border:1px solid #2a2a2a;border-radius:4px;padding:2px 8px;font-size:0.7rem;">${d.note}</span>` : ""}
      </td>
    </tr>`;
  }).join("");
  let cumulativeNet = 0;
  const dataTableRows = sorted.map((d, i) => {
    const netNum = parseNum(d.net);
    parseNum(d.gross);
    cumulativeNet += netNum;
    const prevNetNum = i > 0 ? parseNum(sorted[i - 1].net) : null;
    let trendHtml = "";
    if (prevNetNum !== null && prevNetNum > 0 && netNum > 0) {
      const pctChange = (netNum - prevNetNum) / prevNetNum * 100;
      const isUp = pctChange >= 0;
      trendHtml = `<span style="display:inline-block;background:${isUp ? "rgba(40,120,60,0.25)" : "rgba(180,40,40,0.25)"};color:${isUp ? "#5dba7d" : "#e07070"};border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">
        ${isUp ? "▲" : "▼"} ${Math.abs(pctChange).toFixed(1)}%
      </span>`;
    } else if (i === 0) {
      trendHtml = `<span style="display:inline-block;background:rgba(201,151,58,0.2);color:#c9973a;border-radius:4px;padding:2px 7px;font-size:0.72rem;font-weight:700;">Opening</span>`;
    }
    const isToday = d.day === targetDay;
    const dateStr = d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
    return `
    <tr style="background:${isToday ? "rgba(201,151,58,0.05)" : i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)"};">
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${isToday ? "#c9973a" : "#aaa"};font-weight:700;white-space:nowrap;">
        Day ${d.day}${isToday ? ` <span style="font-size:0.65rem;background:rgba(201,151,58,0.2);color:#c9973a;padding:1px 6px;border-radius:4px;vertical-align:middle;">Latest</span>` : ""}
      </td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.82rem;">${dateStr}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:${isToday ? "#c9973a" : "#ddd"};font-weight:700;">${d.net ? fmtINR(d.net) : "—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#7ec8e3;font-weight:600;">${d.gross ? fmtINR(d.gross) : "—"}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;color:#c9973a;font-weight:700;">${fmtINR(cumulativeNet)}</td>
      <td style="padding:11px 14px;border-bottom:1px solid #1e1e1e;">${trendHtml}</td>
    </tr>`;
  }).join("");
  const tagChips = tags.map((t) => `<span class="tag-chip" style="display:inline-block;background:#1e1e1e;color:#c9973a;border:1px solid #3a2800;border-radius:20px;padding:4px 13px;font-size:0.78rem;font-weight:600;margin:2px;">${t}</span>`).join("\n    ");
  const card = `background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:26px;`;
  const h2 = `font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 20px;line-height:1.3;`;
  const tdL = `padding:10px 0;border-bottom:1px solid #1e1e1e;color:#888;font-size:0.87rem;width:42%;vertical-align:top;`;
  const tdR = `padding:10px 0;border-bottom:1px solid #1e1e1e;color:#ddd;font-size:0.87rem;font-weight:600;`;
  const th = `padding:11px 14px;background:#1f1f1f;color:#888;font-size:0.72rem;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;text-align:left;border-bottom:2px solid #2a2a2a;`;
  const prevSlug = slugify(`${movieName}${year ? ` (${year})` : ""} day ${targetDay - 1} box office collection`);
  const nextSlug = slugify(`${movieName}${year ? ` (${year})` : ""} day ${targetDay + 1} box office collection`);
  const prevDayLabel = `${movieName} Day ${targetDay - 1}`;
  const nextDayLabel = `${movieName} Day ${targetDay + 1}`;
  return `<!-- ════════════════════════════════════════════════════════════════
  OLLYPEDIA SEO META — READ BY CMS
  title:          ${movieName}${year ? ` (${year})` : ""} Day ${targetDay} box office collection and collected ${totalGrossStr} gross | Ollypedia
  description:    ${movieName}${year ? ` (${year})` : ""} Day ${targetDay} box office collection: Collected ${totalNetStr} net and ${totalGrossStr} gross in ${targetDay} day${targetDay !== 1 ? "s" : ""}. Complete day-wise breakdown, audience response, performance analysis & predictions on Ollypedia.
  og:title:       ${movieName}${year ? ` (${year})` : ""} Day ${targetDay} box office collection and collected ${totalGrossStr} gross | Ollypedia
  og:description: ${movieName} has collected ${totalNetStr} net and ${totalGrossStr} gross after ${targetDay} days. Full report on Ollypedia.
════════════════════════════════════════════════════════════════ -->

<!-- ─────────────────────────────────────────────
  JSON-LD SCHEMA — NewsArticle + Movie + BreadcrumbList
  Injected into <head> by CMS. Enables Google rich results:
  - NewsArticle → headline in search + Google News
  - Movie       → movie knowledge panel association
  - BreadcrumbList → breadcrumb path shown in search results
───────────────────────────────────────────── -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "NewsArticle",
      "headline": "${movieName}${year ? ` (${year})` : ""} Day ${targetDay} box office collection and collected ${totalGrossStr} gross",
      "description": "${movieName}${year ? ` (${year})` : ""} Day ${targetDay} box office collection: Collected ${totalNetStr} net and ${totalGrossStr} gross in ${targetDay} day${targetDay !== 1 ? "s" : ""}.",
      "datePublished": "${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}",
      "dateModified": "${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}",
      "author": { "@type": "Organization", "name": "Ollypedia", "url": "https://ollypedia.in" },
      "publisher": {
        "@type": "Organization",
        "name": "Ollypedia",
        "url": "https://ollypedia.in",
        "logo": { "@type": "ImageObject", "url": "https://ollypedia.in/logo.png" }
      },
      "mainEntityOfPage": { "@type": "WebPage", "@id": "https://ollypedia.in/blog/${blogSlug}" },
      "about": {
        "@type": "Movie",
        "name": "${movieName}",
        "inLanguage": "Odia",
        "genre": "${genre}"${releaseDate ? `,
        "datePublished": "${releaseDate}"` : ""}${directorName ? `,
        "director": { "@type": "Person", "name": "${directorName}" }` : ""}${producerName ? `,
        "producer": { "@type": "Person", "name": "${producerName}" }` : ""}${leadActors.length ? `,
        "actor": [${leadActors.map((a) => `{ "@type": "Person", "name": "${a}" }`).join(", ")}]` : ""}
      }
    },
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home",        "item": "https://ollypedia.in" },
        { "@type": "ListItem", "position": 2, "name": "Box Office",  "item": "https://ollypedia.in/box-office" },
        { "@type": "ListItem", "position": 3, "name": "${movieName}", "item": "https://ollypedia.in${boxOfficeUrl}" },
        { "@type": "ListItem", "position": 4, "name": "Day ${targetDay} Collection", "item": "https://ollypedia.in/blog/${blogSlug}" }
      ]
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the total box office collection of ${movieName}${year ? ` (${year})` : ""}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "As of Day ${targetDay}, ${movieName} has collected a total of ${totalNetStr} net and ${totalGrossStr} gross at the Odia box office. These are industry estimates updated daily on Ollypedia."
          }
        },
        {
          "@type": "Question",
          "name": "How much did ${movieName} collect on Day ${targetDay}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "On Day ${targetDay}, ${movieName} collected ${dayNet} net and ${dayGross} gross. The cumulative total stands at ${totalNetStr} net after ${targetDay} day${targetDay !== 1 ? "s" : ""} in theatres."
          }
        }${directorName ? `,
        {
          "@type": "Question",
          "name": "Who directed ${movieName}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${movieName} is directed by ${directorName}.${producerName ? ` The film is produced by ${producerName}.` : ""} It is an Odia language film released in ${year || "2026"} under the Ollywood banner."
          }
        }` : ""}${leadActors.length ? `,
        {
          "@type": "Question",
          "name": "Who are the lead actors in ${movieName}?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${movieName} stars ${leadActors.join(", ")}${leadActresses.length ? ` alongside ${leadActresses.join(", ")}` : ""}.${musicDirector ? ` The music is composed by ${musicDirector}.` : ""}"
          }
        }` : ""},
        {
          "@type": "Question",
          "name": "Is ${movieName} a hit or flop at the box office?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Based on ${targetDay} day${targetDay !== 1 ? "s" : ""} of data, ${movieName} has collected ${totalNetStr} net at the Odia box office.${movie.budget ? ` The film had an estimated budget of ${movie.budget}.` : ""} Ollypedia updates collection figures daily based on industry trade estimates."
          }
        }
      ]
    }
  ]
}
<\/script>


<!-- ─────────────────────────────────────────────
  MOBILE RESPONSIVE STYLES
  Scoped to .ollypedia-blog-content — safe to inject inline.
  No layout or functionality changes, purely presentation fixes.
───────────────────────────────────────────── -->
<style>
/* ── Base resets for blog content ── */
.ollypedia-blog-content img,
.ollypedia-blog-content table,
.ollypedia-blog-content div,
.ollypedia-blog-content section,
.ollypedia-blog-content td,
.ollypedia-blog-content th { box-sizing: border-box; }

/* ── Prevent any element from causing horizontal scroll ── */
.ollypedia-blog-content { overflow-x: hidden; word-break: break-word; }

/* ── Long text, headings, links and data cells wrap instead of overflowing
     (most of this already inherits word-break from the rule above; these
     are explicit so it holds even if an inline style or sanitizer strips
     inheritance) ── */
.ollypedia-blog-content p,
.ollypedia-blog-content span,
.ollypedia-blog-content strong,
.ollypedia-blog-content em,
.ollypedia-blog-content a,
.ollypedia-blog-content h1,
.ollypedia-blog-content h2,
.ollypedia-blog-content h3,
.ollypedia-blog-content td,
.ollypedia-blog-content th {
  overflow-wrap: break-word;
  word-break: break-word;
  max-width: 100%;
}

/* ── Images, charts, video and other embeds never exceed the viewport.
     (No <img>/<iframe> currently ships in this template, but this keeps
     any future poster/embed additions safe automatically.) ── */
.ollypedia-blog-content img,
.ollypedia-blog-content svg,
.ollypedia-blog-content video,
.ollypedia-blog-content iframe,
.ollypedia-blog-content embed,
.ollypedia-blog-content object,
.ollypedia-blog-content canvas {
  max-width: 100%;
  height: auto;
}

/* ── Code blocks and quotes wrap or scroll within themselves instead of
     widening the page ── */
.ollypedia-blog-content pre {
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  overflow-x: auto;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}
.ollypedia-blog-content code {
  overflow-wrap: break-word;
  word-break: break-word;
}
.ollypedia-blog-content blockquote {
  max-width: 100%;
  overflow-wrap: break-word;
  word-break: break-word;
}

/* ── A table is only allowed to exceed 100% width when it explicitly opts
     in via min-width (e.g. the day-wise data table, which scrolls inside
     its own .tbl-scroll/overflow-x:auto wrapper) — min-width still wins
     over this for that table, so its intended horizontal scroll is
     untouched; every other table is capped to the viewport. ── */
.ollypedia-blog-content table { max-width: 100%; }

/* ── Scrollable table wrapper already present; ensure -webkit too ── */
.ollypedia-blog-content .tbl-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }

@media (max-width: 640px) {

  /* Hero section — tighter padding on small screens */
  .ollypedia-blog-content .hero-section {
    padding: 20px 16px 18px !important;
  }

  /* Section cards — reduce horizontal padding */
  .ollypedia-blog-content section[style*="background:#181818"],
  .ollypedia-blog-content section[style*="background: #181818"] {
    padding: 18px 14px !important;
  }

  /* Tags section — reduce horizontal padding to match other cards */
  .ollypedia-blog-content section[style*="background:#111"] {
    padding: 16px 14px !important;
  }

  /* Stat chips grid — force single column on very small screens */
  .ollypedia-blog-content .stat-chips {
    grid-template-columns: 1fr 1fr !important;
  }

  /* Performance analysis stat block — stack vertically */
  .ollypedia-blog-content .perf-stats {
    flex-direction: column !important;
    gap: 12px !important;
  }

  /* Day nav prev/next — stack vertically */
  .ollypedia-blog-content nav[aria-label="Day navigation"] {
    flex-direction: column !important;
  }

  /* Movie details table — label column narrower */
  .ollypedia-blog-content .info-table td:first-child {
    width: 38% !important;
    font-size: 0.8rem !important;
  }

  /* Box office data table cells — reduce padding and font size */
  .ollypedia-blog-content .data-table td,
  .ollypedia-blog-content .data-table th {
    padding: 8px 8px !important;
    font-size: 0.78rem !important;
  }

  /* Bar chart table cells */
  .ollypedia-blog-content .bar-table td {
    padding: 8px 8px !important;
  }

  /* Also Read grid — 1 column */
  .ollypedia-blog-content .also-read-grid {
    grid-template-columns: 1fr !important;
  }

  /* Tag chips — smaller */
  .ollypedia-blog-content .tag-chip {
    font-size: 0.7rem !important;
    padding: 3px 10px !important;
  }

  /* CTA button — full width */
  .ollypedia-blog-content .cta-btn {
    display: block !important;
    width: 100% !important;
    box-sizing: border-box !important;
    text-align: center !important;
  }

  /* FAQ sections — tighter padding */
  .ollypedia-blog-content .faq-section {
    padding: 18px 14px !important;
  }
}

@media (max-width: 400px) {
  /* Stat chips — single column on very narrow screens */
  .ollypedia-blog-content .stat-chips {
    grid-template-columns: 1fr !important;
  }

  /* Hero h1 font size floor */
  .ollypedia-blog-content h1 {
    font-size: 1.1rem !important;
  }
}
</style>

<!-- ─────────────────────────────────────────────
  BREADCRUMB + TIMESTAMP
  Breadcrumb: visual trail matches BreadcrumbList schema above.
  <time>: machine-readable freshness signal for Google.
───────────────────────────────────────────── -->
<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
  <nav aria-label="Breadcrumb" style="font-size:0.78rem;color:#555;display:flex;align-items:center;gap:5px;flex-wrap:wrap;">
    <a href="/" style="color:#777;text-decoration:none;">Home</a>
    <span style="color:#333;">›</span>
    <a href="/box-office" style="color:#777;text-decoration:none;">Box Office</a>
    <span style="color:#333;">›</span>
    <a href="${boxOfficeUrl}" style="color:#777;text-decoration:none;">${movieName}${year ? ` (${year})` : ""}</a>
    <span style="color:#333;">›</span>
    <span style="color:#c9973a;">Day ${targetDay} Collection</span>
  </nav>
  <time datetime="${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}" style="font-size:0.73rem;color:#444;white-space:nowrap;">
    🕐 Updated: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
  </time>
</div>


<!-- ─────────────────────────────────────────────
  HERO BANNER
───────────────────────────────────────────── -->
<div class="hero-section" style="background:linear-gradient(135deg,#1a0e00 0%,#121212 100%);border:1px solid #2e2000;border-radius:14px;padding:30px 28px 24px;margin-bottom:22px;">

  <div style="margin-bottom:14px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
    <span style="display:inline-block;background:#2a1500;color:#c9973a;font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #3a2200;">📊 Box Office Report</span>
    <span style="display:inline-block;background:#1e1e1e;color:#888;font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #2a2a2a;">Day ${targetDay} Update</span>
    ${year ? `<span style="display:inline-block;background:#1e1e1e;color:#888;font-size:0.68rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;padding:4px 12px;border-radius:999px;border:1px solid #2a2a2a;">${year}</span>` : ""}
  </div>

  <h1 style="color:#fff;font-size:clamp(1.2rem,4.5vw,1.6rem);line-height:1.3;font-weight:800;margin:0 0 14px;word-break:break-word;">
    ${movieName}${year ? ` (${year})` : ""} Day ${targetDay} Box Office Collection — ${(sections.seoHeadline || "").replace(/`/g, "&#96;")}
  </h1>

  <p style="color:#bbb;font-size:0.98rem;line-height:1.85;margin:0 0 24px;">${(sections.introParagraph || "").replace(/`/g, "&#96;")}</p>

  <p style="color:#aaa;font-size:0.93rem;line-height:1.7;margin:0 0 24px;">
    According to industry trade estimates, <strong style="color:#fff;">${movieName}</strong> has collected approximately
    <strong style="color:#c9973a;">${totalNetStr} Net</strong> and
    <strong style="color:#7ec8e3;">${totalGrossStr} Gross</strong> in its first ${targetDay} day${targetDay !== 1 ? "s" : ""} of theatrical release.
    ${directorName ? `Directed by <strong style="color:#ddd;">${directorName}</strong>, the` : "The"} film has been running across Odisha with
    ${leadActors.length ? `<strong style="color:#ddd;">${leadActors.slice(0, 2).join(" and ")}</strong> in the lead roles.` : "strong audience support."}
  </p>

  <!-- Stat chips -->
  <div class="stat-chips" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:10px;">
    <div style="background:rgba(0,0,0,0.5);border:1px solid #2e2000;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Total Net</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#c9973a;word-break:break-word;">${totalNetStr}</div>
    </div>
    <div style="background:rgba(0,0,0,0.5);border:1px solid #1a2a3a;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Total Gross</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#7ec8e3;word-break:break-word;">${totalGrossStr}</div>
    </div>
    <div style="background:rgba(0,0,0,0.5);border:1px solid #222;border-radius:10px;padding:14px 16px;">
      <div style="font-size:0.62rem;color:#666;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">Day ${targetDay} Net</div>
      <div style="font-size:clamp(1rem,3.5vw,1.3rem);font-weight:800;color:#fff;word-break:break-word;">${dayNet}</div>
    </div>
  </div>
</div>


<!-- ─────────────────────────────────────────────
  KEY HIGHLIGHT CALLOUT
───────────────────────────────────────────── -->
<div style="background:#180e00;border-left:4px solid #ff9800;border-radius:0 10px 10px 0;padding:14px 20px;margin-bottom:22px;">
  <strong style="color:#ff9800;">📊 Box Office Update:</strong>
  <span style="color:#ccc;"> <strong style="color:#fff;">${movieName}</strong> has collected an estimated
  <strong style="color:#c9973a;">${totalNetStr} net</strong> and
  <strong style="color:#7ec8e3;">${totalGrossStr} gross</strong> after
  <strong style="color:#fff;">${targetDay} day${targetDay !== 1 ? "s" : ""}</strong> in theatres.
  ${totalNet >= 1e7 ? `The film has crossed the <strong style="color:#c9973a;">₹${(totalNet / 1e7).toFixed(0)} Cr mark</strong> at the Odia box office.` : ""}</span>
</div>


<!-- ─────────────────────────────────────────────
  MOVIE DETAILS TABLE
───────────────────────────────────────────── -->
<section style="${card}">
  <h2 style="${h2}">${movieName} Movie Details</h2>
  <table class="info-table" style="width:100%;border-collapse:collapse;">
    <tbody>
      ${infoRows.map(([label, val]) => `
      <tr>
        <td style="${tdL}">${label}</td>
        <td style="${tdR}">${val}</td>
      </tr>`).join("")}
      <tr>
        <td style="${tdL}">Total Net Collection</td>
        <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;color:#c9973a;font-weight:800;font-size:1.05rem;">${totalNetStr}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;color:#888;font-size:0.87rem;width:42%;vertical-align:top;">Total Gross Collection</td>
        <td style="padding:10px 0;color:#7ec8e3;font-weight:800;font-size:1.05rem;">${totalGrossStr}</td>
      </tr>
    </tbody>
  </table>
  <div style="text-align:center;margin-top:22px;">
    <a href="${boxOfficeUrl}" class="cta-btn" style="display:inline-block;background:#ff6b00;color:#fff;text-decoration:none;padding:13px 28px;border-radius:8px;font-weight:800;font-size:0.93rem;">
      🎬 View Latest Box Office Updates
    </a>
  </div>
</section>



<!-- ─────────────────────────────────────────────
  GRAPH 2: STRUCTURED DATA TABLE  (Net · Gross · Cumulative · Trend)
  Best for: exact figures + running total + day-on-day trend
───────────────────────────────────────────── -->
<section style="${card}">
  <h2 style="${h2}">${movieName} Complete Box Office Data — Day-wise Breakdown</h2>
  <p style="color:#666;font-size:0.82rem;margin:0 0 18px;line-height:1.6;">
    Net · Gross · Cumulative net total after each day · Trend vs previous day
  </p>
  <div style="overflow-x:auto;">
    <table class="data-table" style="width:100%;border-collapse:collapse;font-size:0.88rem;min-width:520px;">
      <thead>
        <tr>
          <th style="${th}">Day</th>
          <th style="${th}">Date</th>
          <th style="${th}">Net</th>
          <th style="${th}">Gross</th>
          <th style="${th}">Cumulative Net</th>
          <th style="${th}">Trend</th>
        </tr>
      </thead>
      <tbody>
        ${dataTableRows}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.06em;">
            TOTAL (${sorted.length} days)
          </td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${totalNetStr}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#7ec8e3;font-weight:800;font-size:1rem;">${totalGrossStr}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;color:#c9973a;font-weight:800;font-size:1rem;">${totalNetStr}</td>
          <td style="padding:12px 14px;background:#1f1800;border-top:2px solid #2e2000;"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  EDITORIAL SECTIONS (AI-written)
───────────────────────────────────────────── -->
<section style="${card}">
  <h2 style="${h2}">Box Office Journey — ${movieName}</h2>
  ${pWrap(sections.boxOfficeAnalysis)}
</section>

<section style="${card}">
  <h2 style="${h2}">Weekend vs Weekday Performance</h2>
  ${pWrap(sections.weekendWeekdayComparison)}
</section>

<section style="${card}">
  <h2 style="${h2}">Audience Response</h2>
  ${pWrap(sections.audienceResponse)}
</section>

<section style="${card}">
  <h2 style="${h2}">Occupancy Trends</h2>
  ${pWrap(sections.occupancyTrend)}
</section>

<section style="${card}">
  <h2 style="${h2}">Performance Analysis</h2>
  <div class="perf-stats" style="background:#1f1800;border:1px solid #2e2000;border-radius:10px;padding:16px 20px;margin-bottom:18px;display:flex;gap:24px;flex-wrap:wrap;">
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Total Net</div>
      <div style="font-size:1.2rem;font-weight:800;color:#c9973a;">${totalNetStr}</div>
    </div>
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Total Gross</div>
      <div style="font-size:1.2rem;font-weight:800;color:#7ec8e3;">${totalGrossStr}</div>
    </div>
    <div>
      <div style="font-size:0.65rem;color:#666;text-transform:uppercase;letter-spacing:0.09em;margin-bottom:4px;">Days Tracked</div>
      <div style="font-size:1.2rem;font-weight:800;color:#fff;">${sorted.length}</div>
    </div>
  </div>
  ${pWrap(sections.performanceAnalysis)}
</section>

<section style="${card}">
  <h2 style="${h2}">Impact on the Ollywood Industry</h2>
  ${pWrap(sections.industryImpact)}
</section>

<section style="${card}">
  <h2 style="${h2}">Future Box Office Outlook</h2>
  ${pWrap(sections.prediction)}
  ${pWrap(sections.futureOutlook)}
</section>

<section style="${card}">
  <h2 style="${h2}">Final Verdict</h2>
  <div style="border-left:4px solid #c9973a;padding-left:16px;margin-bottom:16px;">
    ${pWrap(sections.finalVerdict)}
  </div>
  <p style="color:#555;font-size:0.8rem;line-height:1.6;margin:0;">
    <em>* All collection figures are industry estimates sourced by Ollypedia Box Office Tracking. Figures may differ from official studio numbers.</em>
  </p>
</section>


<!-- ─────────────────────────────────────────────
  PREV / NEXT DAY NAVIGATION
  Signals article series to Google. Passes PageRank
  through the day chain. Helps crawlers find all posts.
───────────────────────────────────────────── -->
<nav aria-label="Day navigation" style="display:flex;gap:12px;margin-bottom:22px;flex-wrap:wrap;">
  ${targetDay > 1 ? `<a href="/blog/${prevSlug}" rel="prev" style="flex:1;min-width:140px;display:flex;align-items:center;gap:10px;background:#181818;border:1px solid #242424;border-radius:12px;padding:14px 18px;text-decoration:none;">
    <span style="font-size:1.1rem;color:#555;">←</span>
    <div>
      <div style="font-size:0.65rem;color:#555;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Previous</div>
      <div style="font-size:0.85rem;font-weight:700;color:#aaa;">${prevDayLabel}</div>
      <div style="font-size:0.72rem;color:#555;">Box Office Collection</div>
    </div>
  </a>` : `<div style="flex:1;min-width:140px;"></div>`}
  <a href="/blog/${nextSlug}" rel="next" style="flex:1;min-width:140px;display:flex;align-items:center;justify-content:flex-end;gap:10px;background:#181818;border:1px solid #242424;border-radius:12px;padding:14px 18px;text-decoration:none;text-align:right;">
    <div>
      <div style="font-size:0.65rem;color:#555;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:3px;">Next</div>
      <div style="font-size:0.85rem;font-weight:700;color:#aaa;">${nextDayLabel}</div>
      <div style="font-size:0.72rem;color:#555;">Box Office Collection</div>
    </div>
    <span style="font-size:1.1rem;color:#555;">→</span>
  </a>
</nav>


<!-- ─────────────────────────────────────────────
  FAQ SECTION — Structured Q&A for SEO
  Uses FAQ schema-friendly markup. Google often
  pulls these into rich results / People Also Ask.
───────────────────────────────────────────── -->
<section class="faq-section" style="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 22px;line-height:1.3;">
    Frequently Asked Questions — ${movieName} Box Office
  </h2>

  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      What is the total box office collection of ${movieName}${year ? ` (${year})` : ""}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        As of Day ${targetDay}, <strong style="color:#fff;">${movieName}</strong> has collected a total of
        <strong style="color:#c9973a;">${totalNetStr} net</strong> and
        <strong style="color:#7ec8e3;">${totalGrossStr} gross</strong> at the Odia box office.
        These are industry estimates and figures are updated daily on Ollypedia.
      </p>
    </div>
  </div>

  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      How much did ${movieName} collect on Day ${targetDay}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        On Day ${targetDay}, <strong style="color:#fff;">${movieName}</strong> collected
        <strong style="color:#c9973a;">${dayNet} net</strong> and
        <strong style="color:#7ec8e3;">${dayGross} gross</strong>.
        The cumulative total stands at <strong style="color:#c9973a;">${totalNetStr} net</strong> after ${targetDay} day${targetDay !== 1 ? "s" : ""} in theatres.
      </p>
    </div>
  </div>

  ${directorName ? `
  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Who directed ${movieName}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        <strong style="color:#fff;">${movieName}</strong> is directed by
        <strong style="color:#ddd;">${directorName}</strong>.
        ${producerName ? `The film is produced by <strong style="color:#ddd;">${producerName}</strong>.` : ""}
        It is an Odia language film released in ${year || "2026"} under the Ollywood banner.
      </p>
    </div>
  </div>` : ""}

  ${leadActors.length ? `
  <div style="border-bottom:1px solid #242424;padding-bottom:18px;margin-bottom:18px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Who are the lead actors in ${movieName}?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        <strong style="color:#fff;">${movieName}</strong> stars
        <strong style="color:#ddd;">${leadActors.join(", ")}</strong>${leadActresses.length ? ` alongside <strong style="color:#ddd;">${leadActresses.join(", ")}</strong>` : ""}.
        ${musicDirector ? `The music is composed by <strong style="color:#ddd;">${musicDirector}</strong>.` : ""}
      </p>
    </div>
  </div>` : ""}

  <div style="padding-bottom:4px;">
    <h3 style="font-size:0.93rem;font-weight:700;color:#ddd;margin:0 0 8px;">
      Is ${movieName} a hit or flop at the box office?
    </h3>
    <div>
      <p style="color:#aaa;font-size:0.9rem;line-height:1.8;margin:0;">
        Based on ${targetDay} day${targetDay !== 1 ? "s" : ""} of data, <strong style="color:#fff;">${movieName}</strong> has collected
        <strong style="color:#c9973a;">${totalNetStr} net</strong> at the Odia box office.
        ${movie.budget ? `The film had an estimated budget of <strong style="color:#ddd;">${movie.budget}</strong>.` : ""}
        A detailed performance analysis is available above. Ollypedia updates collection figures daily based on industry trade estimates.
      </p>
    </div>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  ALSO READ — Internal links section
  Signals site structure to Google, passes
  PageRank to related pages, reduces bounce rate.
───────────────────────────────────────────── -->
<section class="faq-section" style="background:#181818;border:1px solid #242424;border-radius:14px;padding:26px 28px;margin-bottom:22px;">
  <h2 style="font-size:1.05rem;font-weight:800;color:#ff6b00;border-left:4px solid #ff6b00;padding-left:12px;margin:0 0 20px;line-height:1.3;">
    Also Read
  </h2>
  <div class="also-read-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
    <a href="${boxOfficeUrl}" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">📊</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">${movieName} Full Box Office Report</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">All days · Running total</div>
      </div>
    </a>
    <a href="/box-office" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">🎬</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">Ollywood Box Office Collection</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Latest Odia movie collections</div>
      </div>
    </a>
    <a href="/movie/${movieSlug}" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">🎭</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">${movieName} — Cast, Story & Details</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Full movie info on Ollypedia</div>
      </div>
    </a>
    <a href="/blog?category=Box%20Office" style="display:flex;align-items:center;gap:10px;background:#1e1e1e;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;text-decoration:none;transition:border-color 0.2s;">
      <span style="font-size:1.3rem;flex-shrink:0;">📰</span>
      <div>
        <div style="font-size:0.82rem;font-weight:700;color:#ddd;line-height:1.4;">More Box Office Reports</div>
        <div style="font-size:0.72rem;color:#666;margin-top:2px;">Latest Ollywood collection news</div>
      </div>
    </a>
  </div>
</section>


<!-- ─────────────────────────────────────────────
  HASHTAGS / SOCIAL TAGS
───────────────────────────────────────────── -->
<section style="background:#111;border-radius:14px;padding:20px 26px;margin-bottom:22px;">
  <h2 style="font-size:0.7rem;font-weight:700;color:#444;text-transform:uppercase;letter-spacing:0.1em;margin:0 0 12px;">Tags</h2>
  <div style="display:flex;flex-wrap:wrap;gap:5px;">
    ${tagChips}
  </div>
</section>


<!-- ─────────────────────────────────────────────
  FOOTER
───────────────────────────────────────────── -->
<div style="border-top:1px solid #1c1c1c;padding-top:16px;margin-top:4px;">
  <p style="color:#444;font-size:0.8rem;line-height:1.8;margin:0;">
    <strong style="color:#555;">Source:</strong> Ollypedia Box Office Tracking &nbsp;·&nbsp;
    <strong style="color:#555;">Last Updated:</strong> <time datetime="${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}" style="color:#444;">Day ${targetDay}, ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</time> &nbsp;·&nbsp;
    <a href="${boxOfficeUrl}" style="color:#c9973a;text-decoration:none;">View full collection report →</a><br>
    <em style="color:#3a3a3a;">All collection figures are industry estimates and may vary from official figures.</em>
  </p>
</div>`;
};
const lbl = {
  display: "block",
  fontSize: "0.72rem",
  color: "var(--muted)",
  fontWeight: 700,
  marginBottom: 5,
  textTransform: "uppercase",
  letterSpacing: "0.06em"
};
function DayModal({ movie, isEdit, dayData, allDays, onClose, onSaved, onToast, trackType = "normal" }) {
  const year = getYear(movie.releaseDate);
  const nextDay = allDays.length ? Math.max(...allDays.map((d) => d.day)) + 1 : 1;
  const getForm = (d) => ({
    day: String((d == null ? void 0 : d.day) ?? nextDay),
    net: String((d == null ? void 0 : d.net) ?? ""),
    gross: String((d == null ? void 0 : d.gross) ?? ""),
    date: String((d == null ? void 0 : d.date) ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10)),
    note: String((d == null ? void 0 : d.note) ?? "")
  });
  const [form, setForm] = useState(getForm(dayData));
  React.useEffect(() => {
    setForm(getForm(dayData));
    if (dayData == null ? void 0 : dayData.gross) setGrossManual(true);
  }, [dayData, nextDay]);
  const [showAi, setShowAi] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiSections, setAiSections] = useState(null);
  const [aiStatus, setAiStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [grossManual, setGrossManual] = useState(!!(dayData == null ? void 0 : dayData.gross));
  const GST_RATE2 = 1.18;
  const set = (k) => (e) => {
    const val = e.target.value;
    if (k === "net") {
      setForm((p) => {
        const netNum = parseToRupees(val);
        const autoGross = netNum > 0 ? fmtINR(Math.round(netNum * GST_RATE2)) : p.gross;
        return { ...p, net: val, gross: grossManual ? p.gross : autoGross };
      });
    } else if (k === "gross") {
      setGrossManual(val.trim() !== "");
      setForm((p) => ({ ...p, gross: val }));
    } else {
      setForm((p) => ({ ...p, [k]: val }));
    }
  };
  const getDaysUpToN = useCallback(() => {
    const current = {
      day: parseInt(form.day, 10),
      net: form.net.trim(),
      gross: form.gross.trim(),
      date: form.date,
      note: form.note.trim()
    };
    const others = (allDays || []).filter((d) => d.day !== current.day);
    return [...others, current].sort((a, b) => a.day - b.day);
  }, [form, allDays]);
  useEffect(() => {
    if (!showAi) return;
    const targetDay2 = parseInt(form.day, 10);
    const daysUpToN = getDaysUpToN();
    const totalNet = daysUpToN.reduce((s, d) => s + parseNum(d.net), 0);
    const totalGross = daysUpToN.reduce((s, d) => s + parseNum(d.gross), 0);
    setAiPrompt(buildAiPrompt(movie, daysUpToN, totalNet, totalGross, targetDay2));
  }, [showAi]);
  const generateAi = async () => {
    if (!aiPrompt.trim()) return;
    setAiStatus("loading");
    setAiText("");
    setAiSections(null);
    try {
      const token = getAdminToken();
      const res = await fetch(`${BASE}/admin/generate-article`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      const rawText = data.text || "";
      setAiText(rawText);
      const _days = getDaysUpToN();
      const _tN = _days.reduce((s, d) => s + parseNum(d.net), 0);
      const _tG = _days.reduce((s, d) => s + parseNum(d.gross), 0);
      setAiSections(parseAiSections(rawText, movie, parseInt(form.day, 10), _tN, _tG, _days));
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
      day: parseInt(form.day, 10),
      net: form.net.trim(),
      gross: form.gross.trim(),
      date: form.date,
      note: form.note.trim()
    };
    try {
      if (isEdit) {
        await API.adminUpdateBoxOfficeDay(movie._id, payload.day, payload, trackType);
      } else {
        await API.adminAddBoxOfficeDay(movie._id, payload, trackType);
      }
      onToast(`Day ${payload.day} ${isEdit ? "updated" : "added"}!`, "success");
      if (showAi) {
        const daysUpToN = getDaysUpToN();
        const totalNet = daysUpToN.reduce((s, d) => s + parseNum(d.net), 0);
        const totalGross = daysUpToN.reduce((s, d) => s + parseNum(d.gross), 0);
        const targetDay2 = payload.day;
        const isReRelease = trackType === "re-release";
        const titleSuffix = isReRelease ? " (Re-Release)" : "";
        const slugSuffix = isReRelease ? "-re-release" : "";
        const blogTitle = `${movie.title}${year ? ` (${year})` : ""}${titleSuffix} Day ${targetDay2} box office collection and collected ${fmtINR(totalGross)} gross`;
        const blogSlugBase = `${movie.title}${year ? ` (${year})` : ""}${slugSuffix} day ${targetDay2} box office collection`;
        const blogSlug = slugify(blogSlugBase);
        const parsedSecs = aiSections || parseAiSections(aiText, movie, targetDay2, totalNet, totalGross, daysUpToN);
        const content = buildBlogContent(movie, daysUpToN, totalNet, totalGross, targetDay2, parsedSecs, blogSlug, trackType);
        const excerpt = parsedSecs.introParagraph || `${blogTitle}: Net ${fmtINR(payload.net || 0)}, Gross ${fmtINR(payload.gross || 0)}. Total ${fmtINR(totalNet)} net in ${daysUpToN.length} days.`;
        const seoTitle = `${movie.title}${year ? ` (${year})` : ""}${titleSuffix} Day ${targetDay2} box office collection and collected ${fmtINR(totalGross)} gross | Ollypedia`;
        const seoDesc = `${movie.title}${year ? ` (${year})` : ""}${titleSuffix} Day ${targetDay2} box office collection: The film has collected ${fmtINR(totalNet)} net and ${fmtINR(totalGross)} gross in ${targetDay2} day${targetDay2 !== 1 ? "s" : ""}. Check complete day-wise breakdown, audience response, and performance analysis on Ollypedia.`;
        const blogPayload = {
          title: blogTitle,
          slug: blogSlug,
          excerpt,
          content,
          category: "Box Office",
          tags: [
            movie.title,
            "Box Office",
            "Odia Cinema",
            "Ollywood",
            `Day ${targetDay2}`,
            year ? String(year) : null,
            ...parsedSecs && movie.cast ? (() => {
              const ci = extractCastInfo(movie);
              return [
                ci.directorName,
                ci.producerName,
                ci.musicDirector,
                ...ci.leadActors,
                ...ci.leadActresses
              ].filter(Boolean);
            })() : []
          ].filter(Boolean),
          coverImage: movie.bannerUrl || movie.posterUrl || "",
          movieId: movie._id,
          movieTitle: movie.title,
          published: true,
          featured: false,
          seoTitle,
          seoDesc
        };
        let existingId = null;
        try {
          const allBlogs = await API.adminGetBlogPosts();
          const match = allBlogs.find((b) => b.slug === blogSlug);
          if (match) existingId = match._id;
        } catch {
        }
        if (existingId) {
          await API.adminUpdateBlog(existingId, blogPayload);
          onToast(`✅ Day ${targetDay2} blog updated at /blog/${blogSlug}`, "success");
        } else {
          await API.adminCreateBlog(blogPayload);
          onToast(`✅ Day ${targetDay2} blog published at /blog/${blogSlug}`, "success");
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
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: onClose, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: "modal",
      onClick: (e) => e.stopPropagation(),
      style: { maxWidth: 580, maxHeight: "90vh", overflowY: "auto" },
      children: [
        /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
          /* @__PURE__ */ jsxs("span", { className: "modal-title", children: [
            isEdit ? `✏️ Edit Day ${dayData.day}` : `➕ Add Day ${form.day}`,
            " — ",
            movie.title,
            year ? ` (${year})` : ""
          ] }),
          /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: onClose, children: "×" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { padding: "22px 24px" }, children: [
          err && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16, padding: "10px 14px", background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.4)", borderRadius: 8, color: "#e87a6a", fontSize: "0.82rem" }, children: [
            "⚠️ ",
            err
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { style: lbl, children: "Day Number" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "form-input",
                  style: { width: "100%", boxSizing: "border-box" },
                  type: "number",
                  min: "1",
                  value: form.day,
                  onChange: set("day"),
                  disabled: isEdit
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { style: lbl, children: "Date" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "form-input",
                  style: { width: "100%", boxSizing: "border-box" },
                  type: "date",
                  value: form.date,
                  onChange: set("date")
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { style: lbl, children: "Net Collection (₹)" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "form-input",
                  style: { width: "100%", boxSizing: "border-box" },
                  type: "text",
                  placeholder: "e.g. 45,00,000",
                  value: form.net,
                  onChange: set("net"),
                  autoFocus: !isEdit
                }
              ),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.65rem", color: "var(--muted)", marginTop: 4 }, children: "Gross auto-calculates at Net × 1.18 (18% GST)" })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }, children: [
                /* @__PURE__ */ jsx("label", { style: { ...lbl, marginBottom: 0 }, children: "Gross Collection (₹)" }),
                grossManual && /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: () => {
                      setGrossManual(false);
                      const netNum = parseFloat(form.net.replace(/[^0-9.]/g, ""));
                      const autoGross = !isNaN(netNum) && netNum > 0 ? String(Math.round(netNum * GST_RATE2)) : "";
                      setForm((p) => ({ ...p, gross: autoGross }));
                    },
                    style: { fontSize: "0.6rem", color: "var(--gold)", background: "rgba(201,151,58,0.12)", border: "1px solid rgba(201,151,58,0.3)", borderRadius: 6, padding: "2px 7px", cursor: "pointer", fontWeight: 700 },
                    children: "↺ Auto"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  className: "form-input",
                  style: { width: "100%", boxSizing: "border-box", borderColor: grossManual ? "rgba(201,151,58,0.5)" : void 0 },
                  type: "text",
                  placeholder: "Auto-filled from Net",
                  value: form.gross,
                  onChange: set("gross")
                }
              ),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.65rem", marginTop: 4, color: grossManual ? "var(--gold)" : "var(--muted)" }, children: grossManual ? "✏️ Manual override — click ↺ Auto to recalculate" : "✅ Auto-calculated from Net" })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { marginBottom: 20 }, children: [
            /* @__PURE__ */ jsx("label", { style: lbl, children: "Notes (optional)" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "form-input",
                style: { width: "100%", boxSizing: "border-box" },
                type: "text",
                placeholder: "e.g. 2nd Saturday, Holiday boost",
                value: form.note,
                onChange: set("note")
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { style: { borderTop: "1px solid var(--border)", margin: "0 0 20px" } }),
          /* @__PURE__ */ jsxs(
            "div",
            {
              style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: showAi ? 16 : 0, cursor: "pointer", userSelect: "none" },
              onClick: () => setShowAi((p) => !p),
              children: [
                /* @__PURE__ */ jsxs("div", { style: { flex: 1 }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { fontWeight: 700, fontSize: "0.9rem" }, children: [
                    "🤖 Generate AI Blog for Day ",
                    targetDay
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.71rem", color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }, children: [
                    "Will publish at",
                    " ",
                    /* @__PURE__ */ jsxs("code", { style: { background: "var(--bg3)", padding: "1px 6px", borderRadius: 4, color: "var(--gold)", fontSize: "0.68rem" }, children: [
                      "/blog/",
                      blogSlugPreview
                    ] }),
                    " ",
                    "with Day 1–",
                    targetDay,
                    " cumulative data"
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { style: { width: 42, height: 24, borderRadius: 12, background: showAi ? "var(--gold)" : "var(--bg3)", border: "1px solid var(--border)", position: "relative", transition: "background 0.2s", flexShrink: 0 }, children: /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: 3, left: showAi ? 21 : 3, width: 16, height: 16, borderRadius: 8, background: "#fff", transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.4)" } }) })
              ]
            }
          ),
          showAi && /* @__PURE__ */ jsxs("div", { style: { background: "rgba(201,151,58,0.04)", border: "1px solid rgba(201,151,58,0.18)", borderRadius: 10, padding: "16px 18px", marginBottom: 18 }, children: [
            /* @__PURE__ */ jsx("label", { style: { ...lbl, color: "#c9973a" }, children: "AI Prompt (edit before generating)" }),
            /* @__PURE__ */ jsx(
              "textarea",
              {
                className: "form-input",
                value: aiPrompt,
                onChange: (e) => setAiPrompt(e.target.value),
                rows: 7,
                style: { width: "100%", boxSizing: "border-box", fontSize: "0.76rem", lineHeight: 1.65, resize: "vertical", fontFamily: "monospace", marginBottom: 10 },
                placeholder: "Prompt will auto-fill when you open this section…"
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-sm",
                style: { width: "100%", background: "rgba(201,151,58,0.14)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.4)", fontWeight: 700 },
                onClick: generateAi,
                disabled: aiStatus === "loading" || !aiPrompt.trim(),
                children: aiStatus === "loading" ? "⏳ Generating with Groq AI…" : aiStatus === "done" ? "✅ Regenerate" : "🤖 Generate Blog Content"
              }
            ),
            aiStatus === "error" && /* @__PURE__ */ jsx("div", { style: { marginTop: 10, fontSize: "0.78rem", color: "#e87a6a" }, children: "❌ Generation failed — check GROQ_API_KEY in .env, then retry." }),
            aiStatus === "done" && aiSections && (() => {
              const SECTION_META = [
                { label: "SEO Headline", key: "seoHeadline", rows: 1 },
                { label: "Intro Paragraph", key: "introParagraph", rows: 3 },
                { label: "Box Office Journey", key: "boxOfficeAnalysis", rows: 5 },
                { label: "Audience Response", key: "audienceResponse", rows: 4 },
                { label: "Performance Analysis", key: "performanceAnalysis", rows: 4 },
                { label: "Future Prediction", key: "prediction", rows: 3 },
                { label: "Final Verdict", key: "finalVerdict", rows: 3 }
              ];
              return /* @__PURE__ */ jsxs("div", { style: { marginTop: 14 }, children: [
                /* @__PURE__ */ jsx("div", { style: { fontSize: "0.72rem", color: "var(--gold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }, children: "✅ Generated — Edit any section below before saving" }),
                SECTION_META.map(({ label, key, rows }) => /* @__PURE__ */ jsxs("div", { style: { marginBottom: 14 }, children: [
                  /* @__PURE__ */ jsx("label", { style: { display: "block", fontSize: "0.68rem", color: "var(--muted)", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }, children: label }),
                  /* @__PURE__ */ jsx(
                    "textarea",
                    {
                      className: "form-input",
                      value: aiSections[key] || "",
                      onChange: (e) => setAiSections((prev) => ({ ...prev, [key]: e.target.value })),
                      rows,
                      style: { width: "100%", boxSizing: "border-box", fontSize: "0.77rem", lineHeight: 1.7, resize: "vertical" }
                    }
                  )
                ] }, key)),
                /* @__PURE__ */ jsx("div", { style: { fontSize: "0.68rem", color: "var(--muted)", marginTop: 4, lineHeight: 1.6 }, children: "✏️ Edit any section above. Blog publishes with full SEO, schema, hero, day-wise table & all sections." })
              ] });
            })()
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10 }, children: [
            /* @__PURE__ */ jsx("button", { className: "btn btn-ghost", style: { flex: 1 }, onClick: onClose, disabled: saving, children: "Cancel" }),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-gold",
                style: { flex: 2, fontWeight: 800 },
                onClick: handleSave,
                disabled: saving || showAi && aiStatus === "loading",
                children: saving ? "Saving…" : showAi ? `💾 Save Day ${targetDay} + Publish Blog` : `💾 Save Day ${targetDay}`
              }
            )
          ] }),
          showAi && /* @__PURE__ */ jsxs("p", { style: { marginTop: 10, fontSize: "0.7rem", color: "var(--muted)", textAlign: "center", lineHeight: 1.6 }, children: [
            "Day ",
            targetDay,
            " blog will include ",
            /* @__PURE__ */ jsxs("strong", { style: { color: "var(--text)" }, children: [
              "all days 1–",
              targetDay
            ] }),
            " in the table. Day 1 blog has 1 row, Day 2 has 2 rows, and so on."
          ] })
        ] })
      ]
    }
  ) });
}
function BulkUploadModal({ movie, allDays, onClose, onSaved, onToast }) {
  const year = getYear(movie.releaseDate);
  const nextDay = allDays.length ? Math.max(...allDays.map((d) => d.day)) + 1 : 1;
  const existingDaySet = new Set(allDays.map((d) => d.day));
  const [tab, setTab] = useState("file");
  const [startDay, setStartDay] = useState(nextDay);
  const [numRows, setNumRows] = useState(30);
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const fileInputRef = useRef(null);
  const priceRows = (entries) => {
    const byDay = /* @__PURE__ */ new Map();
    entries.forEach(({ day, netRaw }) => byDay.set(day, { day, netRaw }));
    return Array.from(byDay.values()).sort((a, b) => a.day - b.day).map((r) => {
      const netNum = parseToRupees(r.netRaw);
      return {
        ...r,
        netNum,
        valid: netNum > 0,
        grossNum: netNum > 0 ? Math.round(netNum * GST_RATE) : 0,
        date: addDaysToISO(movie.releaseDate, r.day),
        isUpdate: existingDaySet.has(r.day)
      };
    });
  };
  const handleDownloadTemplate = () => {
    const csv = buildBoxOfficeTemplateCSV(movie, startDay, numRows);
    const safeName = slugify(movie.title || "movie");
    downloadCSV(csv, `${safeName}-boxoffice-template-day${startDay}-to-${startDay + numRows - 1}.csv`);
  };
  const handleFileChange = async (e) => {
    var _a;
    const file = (_a = e.target.files) == null ? void 0 : _a[0];
    if (!file) return;
    setErr("");
    try {
      const text = await file.text();
      const csvRows = parseCSVText(text);
      const entries = parseBulkCSVRows(csvRows);
      if (!entries.length) {
        setErr("No usable rows found — make sure the Net Collection column is filled in.");
        setRows([]);
      } else {
        setRows(priceRows(entries));
      }
    } catch (e2) {
      setErr("Could not read that file: " + e2.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const handleParsePaste = () => {
    setErr("");
    const entries = parseBulkPasteText(pasteText);
    if (!entries.length) {
      setErr('Could not find any day lines. Try one entry per line, e.g. "Day 1 - 1500000".');
      setRows([]);
    } else {
      setRows(priceRows(entries));
    }
  };
  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);
  const newCount = validRows.filter((r) => !r.isUpdate).length;
  const updateCount = validRows.filter((r) => r.isUpdate).length;
  const handleConfirm = async () => {
    if (!validRows.length) return;
    setSaving(true);
    setErr("");
    try {
      const payload = { days: validRows.map((r) => ({ day: r.day, net: String(r.netNum) })) };
      const res = await API.adminBulkBoxOfficeDays(movie._id, payload);
      onToast(`✅ Saved ${res.added || 0} new + ${res.updated || 0} updated day(s) for ${movie.title}.`, "success");
      onSaved();
      onClose();
    } catch (e) {
      setErr(e.message || "Bulk save failed.");
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsx("div", { className: "modal-overlay", onClick: onClose, children: /* @__PURE__ */ jsxs("div", { className: "modal", onClick: (e) => e.stopPropagation(), style: { maxWidth: 700, maxHeight: "90vh", overflowY: "auto" }, children: [
    /* @__PURE__ */ jsxs("div", { className: "modal-header", children: [
      /* @__PURE__ */ jsxs("span", { className: "modal-title", children: [
        "📤 Bulk Box Office Upload — ",
        movie.title,
        year ? ` (${year})` : ""
      ] }),
      /* @__PURE__ */ jsx("button", { className: "modal-close", onClick: onClose, children: "×" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { padding: "22px 24px" }, children: [
      !movie.releaseDate && /* @__PURE__ */ jsx("div", { style: { marginBottom: 16, padding: "10px 14px", background: "rgba(220,160,40,0.08)", border: "1px solid rgba(220,160,40,0.3)", borderRadius: 8, color: "#d9a73a", fontSize: "0.8rem" }, children: "⚠️ This movie has no release date set, so per-day dates can't be auto-calculated. Set a release date first so Day 1 = release date works correctly." }),
      err && /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16, padding: "10px 14px", background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.4)", borderRadius: 8, color: "#e87a6a", fontSize: "0.82rem" }, children: [
        "⚠️ ",
        err
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, marginBottom: 18 }, children: [["file", "📄 Template File"], ["paste", "✏️ Paste Data"]].map(([key, label]) => /* @__PURE__ */ jsx(
        "button",
        {
          onClick: () => {
            setTab(key);
            setRows([]);
            setErr("");
          },
          className: tab === key ? "btn btn-gold btn-sm" : "btn btn-ghost btn-sm",
          style: { fontWeight: 700 },
          children: label
        },
        key
      )) }),
      tab === "file" && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }, children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: lbl, children: "Start Day" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "form-input",
                style: { width: "100%", boxSizing: "border-box" },
                type: "number",
                min: "1",
                value: startDay,
                onChange: (e) => setStartDay(parseInt(e.target.value, 10) || 1)
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("label", { style: lbl, children: "Number of Days" }),
            /* @__PURE__ */ jsx(
              "input",
              {
                className: "form-input",
                style: { width: "100%", boxSizing: "border-box" },
                type: "number",
                min: "1",
                max: "200",
                value: numRows,
                onChange: (e) => setNumRows(parseInt(e.target.value, 10) || 1)
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsxs("button", { className: "btn btn-ghost btn-sm", style: { width: "100%", marginBottom: 14, fontWeight: 700 }, onClick: handleDownloadTemplate, children: [
          "⬇️ Download Template (Day ",
          startDay,
          "–",
          startDay + numRows - 1,
          ")"
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginBottom: 16, lineHeight: 1.6 }, children: [
          "Open it in Excel/Sheets, fill in the ",
          /* @__PURE__ */ jsx("strong", { style: { color: "var(--text)" }, children: "Net Collection" }),
          " column only — leave a day blank to skip it — then save as ",
          /* @__PURE__ */ jsx("strong", { style: { color: "var(--text)" }, children: ".csv" }),
          " and upload it below. Dates and Gross are always calculated automatically; whatever ends up in the Date column is ignored."
        ] }),
        /* @__PURE__ */ jsx("label", { style: lbl, children: "Upload Filled Template (.csv)" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            ref: fileInputRef,
            type: "file",
            accept: ".csv,text/csv",
            onChange: handleFileChange,
            className: "form-input",
            style: { width: "100%", boxSizing: "border-box" }
          }
        )
      ] }),
      tab === "paste" && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("label", { style: lbl, children: "Paste day-wise data (one entry per line)" }),
        /* @__PURE__ */ jsx(
          "textarea",
          {
            className: "form-input",
            style: { width: "100%", boxSizing: "border-box", minHeight: 140, fontFamily: "monospace", fontSize: "0.82rem", resize: "vertical" },
            placeholder: "Day 1 - 1500000\nDay 2 - 2200000\nDay 3 - 1.8 Cr\n…",
            value: pasteText,
            onChange: (e) => setPasteText(e.target.value)
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "var(--muted)", margin: "8px 0 14px", lineHeight: 1.6 }, children: [
          'Accepts formats like "Day 1 - 1500000", "1,15L", "1 1.2 Cr" — one entry per line. Dates and Gross are calculated automatically from Day 1 = ',
          movie.releaseDate ? new Date(movie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "the release date",
          "."
        ] }),
        /* @__PURE__ */ jsx("button", { className: "btn btn-gold btn-sm", style: { fontWeight: 800 }, onClick: handleParsePaste, disabled: !pasteText.trim(), children: "🔍 Parse & Preview" })
      ] }),
      rows.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { style: { borderTop: "1px solid var(--border)", margin: "20px 0 16px" } }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }, children: [
          /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", background: "rgba(80,200,120,0.12)", color: "#6fd08c", border: "1px solid rgba(80,200,120,0.3)", padding: "3px 10px", borderRadius: 10, fontWeight: 700 }, children: [
            newCount,
            " new"
          ] }),
          updateCount > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", background: "rgba(201,151,58,0.12)", color: "var(--gold)", border: "1px solid rgba(201,151,58,0.3)", padding: "3px 10px", borderRadius: 10, fontWeight: 700 }, children: [
            updateCount,
            " will be overwritten"
          ] }),
          invalidRows.length > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.72rem", background: "rgba(220,50,50,0.1)", color: "#e87a6a", border: "1px solid rgba(220,50,50,0.3)", padding: "3px 10px", borderRadius: 10, fontWeight: 700 }, children: [
            invalidRows.length,
            " skipped (no readable amount)"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { maxHeight: 280, overflowY: "auto", border: "1px solid var(--border)", borderRadius: 10 }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }, children: [
          /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { style: { background: "var(--bg2)" }, children: ["Day", "Date", "Net", "Gross", "Status"].map((h) => /* @__PURE__ */ jsx("th", { style: { padding: "8px 12px", textAlign: "left", fontSize: "0.62rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: "2px solid var(--border)", position: "sticky", top: 0, background: "var(--bg2)" }, children: h }, h)) }) }),
          /* @__PURE__ */ jsx("tbody", { children: rows.map((r) => /* @__PURE__ */ jsxs("tr", { style: { borderBottom: "1px solid var(--border)", opacity: r.valid ? 1 : 0.5 }, children: [
            /* @__PURE__ */ jsxs("td", { style: { padding: "7px 12px", fontWeight: 700, color: "var(--gold)" }, children: [
              "Day ",
              r.day
            ] }),
            /* @__PURE__ */ jsx("td", { style: { padding: "7px 12px", color: "var(--muted)" }, children: r.date ? new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }),
            /* @__PURE__ */ jsx("td", { style: { padding: "7px 12px", fontWeight: 600 }, children: r.valid ? fmtINR(r.netNum) : r.netRaw || "—" }),
            /* @__PURE__ */ jsx("td", { style: { padding: "7px 12px", color: "#7ec8e3" }, children: r.valid ? fmtINR(r.grossNum) : "—" }),
            /* @__PURE__ */ jsx("td", { style: { padding: "7px 12px", fontSize: "0.72rem" }, children: !r.valid ? /* @__PURE__ */ jsx("span", { style: { color: "#e87a6a" }, children: "⚠️ unreadable amount" }) : r.isUpdate ? /* @__PURE__ */ jsx("span", { style: { color: "var(--gold)" }, children: "↻ update" }) : /* @__PURE__ */ jsx("span", { style: { color: "#6fd08c" }, children: "+ new" }) })
          ] }, r.day)) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, marginTop: 22 }, children: [
        /* @__PURE__ */ jsx("button", { className: "btn btn-ghost", style: { flex: 1 }, onClick: onClose, disabled: saving, children: "Cancel" }),
        /* @__PURE__ */ jsx(
          "button",
          {
            className: "btn btn-gold",
            style: { flex: 2, fontWeight: 800 },
            onClick: handleConfirm,
            disabled: saving || validRows.length === 0,
            children: saving ? "Saving…" : `💾 Save ${validRows.length} Day${validRows.length !== 1 ? "s" : ""}`
          }
        )
      ] })
    ] })
  ] }) });
}
function BoxOfficePanel({ movies, onToast }) {
  const [query, setQuery] = useState("");
  const [dropResults, setDropResults] = useState([]);
  const [showDrop, setShowDrop] = useState(false);
  const [selMovie, setSelMovie] = useState(null);
  const [days, setDays] = useState([]);
  const [reReleaseDays, setReReleaseDays] = useState([]);
  const [loadingDays, setLoadingDays] = useState(false);
  const [modal, setModal] = useState(null);
  const [bulkModal, setBulkModal] = useState(false);
  const dropRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  useEffect(() => {
    if (!query.trim() || selMovie) {
      setDropResults([]);
      setShowDrop(false);
      return;
    }
    const q = query.toLowerCase();
    const filtered = (Array.isArray(movies) ? movies : []).filter((m) => (m.title || "").toLowerCase().includes(q)).slice(0, 8);
    setDropResults(filtered);
    setShowDrop(filtered.length > 0);
  }, [query, movies, selMovie]);
  const loadDays = useCallback(async (movie) => {
    if (!(movie == null ? void 0 : movie._id)) return;
    setDays([]);
    setReReleaseDays([]);
    setLoadingDays(true);
    try {
      const data = await API.getMovieBoxOfficeDays(movie._id, "original");
      const sorted = Array.isArray(data) ? [...data].sort((a, b) => a.day - b.day) : [];
      setDays(sorted);
      if (movie.isReRelease) {
        try {
          const rrData = await API.getMovieBoxOfficeDays(movie._id, "re-release");
          const rrSorted = Array.isArray(rrData) ? [...rrData].sort((a, b) => a.day - b.day) : [];
          setReReleaseDays(rrSorted);
        } catch (_) {
          setReReleaseDays([]);
        }
      }
    } catch (e) {
      onToast == null ? void 0 : onToast("Failed to load data: " + e.message, "error");
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
  const clearMovie = () => {
    setSelMovie(null);
    setQuery("");
    setDays([]);
    setReReleaseDays([]);
  };
  days.reduce((s, d) => s + parseNum(d.net), 0);
  days.reduce((s, d) => s + parseNum(d.gross), 0);
  const nextDay = days.length ? Math.max(...days.map((d) => d.day)) + 1 : 1;
  const year = selMovie ? getYear(selMovie.releaseDate) : "";
  const hasReRelease = !!((selMovie == null ? void 0 : selMovie.isReRelease) && (selMovie == null ? void 0 : selMovie.reReleaseDate));
  const origTotalNet = days.reduce((s, d) => s + parseNum(d.net), 0);
  const origTotalGross = days.reduce((s, d) => s + parseNum(d.gross), 0);
  const rrTotalNet = reReleaseDays.reduce((s, d) => s + parseNum(d.net), 0);
  const rrTotalGross = reReleaseDays.reduce((s, d) => s + parseNum(d.gross), 0);
  const rrNextDay = reReleaseDays.length ? Math.max(...reReleaseDays.map((d) => d.day)) + 1 : 1;
  return /* @__PURE__ */ jsxs("div", { style: { padding: "0 28px 60px" }, children: [
    /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      position: "sticky",
      top: 0,
      zIndex: 50,
      background: "var(--bg1)",
      padding: "13px 28px",
      margin: "0 -28px 28px",
      boxShadow: "0 2px 20px rgba(0,0,0,0.5)",
      borderBottom: "1px solid var(--border)"
    }, children: [
      /* @__PURE__ */ jsx("h2", { style: { fontSize: "1.3rem", margin: 0, fontWeight: 800 }, children: "📊 Box Office" }),
      selMovie && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.74rem", color: "var(--gold)", background: "rgba(201,151,58,0.1)", border: "1px solid rgba(201,151,58,0.25)", padding: "3px 10px", borderRadius: 12, fontWeight: 600 }, children: [
        selMovie.title,
        year ? ` (${year})` : ""
      ] }),
      selMovie && days.length > 0 && /* @__PURE__ */ jsxs("span", { style: { fontSize: "0.68rem", color: "var(--muted)", background: "var(--bg3)", padding: "3px 9px", borderRadius: 10, fontWeight: 600 }, children: [
        days.length,
        " day",
        days.length !== 1 ? "s" : "",
        " recorded"
      ] }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1 } }),
      selMovie && /* @__PURE__ */ jsx(
        "button",
        {
          className: "btn btn-ghost btn-sm",
          style: { fontWeight: 800 },
          onClick: () => setBulkModal(true),
          children: "📤 Bulk Upload"
        }
      ),
      selMovie && /* @__PURE__ */ jsxs(
        "button",
        {
          className: "btn btn-gold btn-sm",
          style: { fontWeight: 800 },
          onClick: () => setModal({ isEdit: false, dayData: null }),
          children: [
            "+ Add Day ",
            nextDay
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { maxWidth: 500, marginBottom: 32 }, children: [
      /* @__PURE__ */ jsx("label", { style: { ...lbl, marginBottom: 8, fontSize: "0.78rem" }, children: "Search Movie" }),
      /* @__PURE__ */ jsxs("div", { ref: dropRef, style: { position: "relative" }, children: [
        /* @__PURE__ */ jsx("span", { style: { position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none", zIndex: 1 }, children: "🔍" }),
        /* @__PURE__ */ jsx(
          "input",
          {
            className: "form-input",
            style: { paddingLeft: 38, paddingRight: selMovie ? 36 : 14, width: "100%", boxSizing: "border-box" },
            placeholder: "Type movie name to search…",
            value: query,
            onChange: (e) => {
              setQuery(e.target.value);
              if (selMovie) {
                setSelMovie(null);
                setDays([]);
              }
            },
            onFocus: () => dropResults.length > 0 && setShowDrop(true)
          }
        ),
        selMovie && /* @__PURE__ */ jsx("button", { onClick: clearMovie, style: { position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--muted)", fontSize: "1.2rem", padding: 0 }, children: "×" }),
        showDrop && dropResults.length > 0 && /* @__PURE__ */ jsx("div", { style: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 200, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.65)" }, children: dropResults.map((m) => /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => selectMovie(m),
            style: { display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 14px", background: "none", border: "none", cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--border)" },
            onMouseEnter: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.09)",
            onMouseLeave: (e) => e.currentTarget.style.background = "none",
            children: [
              (m.posterUrl || m.thumbnailUrl) && /* @__PURE__ */ jsx("img", { src: m.posterUrl || m.thumbnailUrl, alt: m.title, style: { width: 28, height: 38, objectFit: "cover", borderRadius: 4, flexShrink: 0 }, onError: (e) => e.target.style.display = "none" }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, fontSize: "0.88rem" }, children: m.title }),
                /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.68rem", color: "var(--muted)" }, children: [
                  m.releaseDate ? new Date(m.releaseDate).getFullYear() : "TBA",
                  m.language ? ` · ${m.language}` : ""
                ] })
              ] })
            ]
          },
          m._id
        )) }),
        showDrop && dropResults.length === 0 && query.trim() && !selMovie && /* @__PURE__ */ jsxs("div", { style: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 10, zIndex: 200, padding: 16, color: "var(--muted)", fontSize: "0.83rem" }, children: [
          'No movies found for "',
          query,
          '"'
        ] })
      ] })
    ] }),
    !selMovie && /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "80px 0", color: "var(--muted)" }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: "4rem", marginBottom: 16 }, children: "📊" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "1.1rem", fontWeight: 800, marginBottom: 8, color: "var(--text)" }, children: "Box Office Tracker" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: "0.84rem", maxWidth: 380, margin: "0 auto", lineHeight: 1.8 }, children: "Search a movie above to record day-wise collection and publish AI-powered box office blogs per day." })
    ] }),
    selMovie && /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { style: { background: "var(--bg2)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px", marginBottom: 28, overflow: "hidden", position: "relative" }, children: [
        selMovie.bannerUrl && /* @__PURE__ */ jsx("img", { src: selMovie.bannerUrl, alt: "", style: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.06, pointerEvents: "none" }, onError: (e) => e.target.style.display = "none" }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 20, alignItems: "flex-start", position: "relative", zIndex: 1 }, children: [
          (selMovie.posterUrl || selMovie.thumbnailUrl) && /* @__PURE__ */ jsx(
            "img",
            {
              src: selMovie.posterUrl || selMovie.thumbnailUrl,
              alt: selMovie.title,
              style: { width: 68, height: 94, objectFit: "cover", borderRadius: 10, flexShrink: 0, boxShadow: "0 4px 20px rgba(0,0,0,0.7)" },
              onError: (e) => e.target.style.display = "none"
            }
          ),
          /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { fontWeight: 800, fontSize: "1.25rem", lineHeight: 1.2, marginBottom: 4 }, children: [
              selMovie.title,
              year ? ` (${year})` : "",
              hasReRelease && /* @__PURE__ */ jsx("span", { style: { marginLeft: 8, fontSize: "0.65rem", background: "rgba(201,151,58,0.18)", color: "#c9973a", padding: "2px 8px", borderRadius: 10, fontWeight: 700, verticalAlign: "middle" }, children: "🔄 Re-Release" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.75rem", color: "var(--muted)", marginBottom: 16 }, children: [
              selMovie.releaseDate ? new Date(selMovie.releaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Release TBA",
              hasReRelease && ` · Re-Release: ${new Date(selMovie.reReleaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
              selMovie.language ? ` · ${selMovie.language}` : "",
              selMovie.budget ? ` · Budget: ${selMovie.budget}` : ""
            ] }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 10 }, children: [
              { label: "Original Net", value: fmtINR(origTotalNet), color: "var(--gold)" },
              { label: "Original Gross", value: fmtINR(origTotalGross), color: "#7ec8e3" },
              hasReRelease ? { label: "Re-Release Net", value: fmtINR(rrTotalNet), color: "#e89b3a" } : null,
              hasReRelease ? { label: "Re-Release Gross", value: fmtINR(rrTotalGross), color: "#a8d8ea" } : null,
              { label: "Days", value: loadingDays ? "…" : days.length || "—", color: "var(--text)" }
            ].filter(Boolean).map(({ label: l, value, color }) => /* @__PURE__ */ jsxs("div", { style: { background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: "9px 16px", border: "1px solid rgba(255,255,255,0.06)", minWidth: 110 }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontSize: "0.6rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 3 }, children: l }),
              /* @__PURE__ */ jsx("div", { style: { fontSize: "1.05rem", fontWeight: 800, color }, children: value })
            ] }, l)) })
          ] })
        ] })
      ] }),
      loadingDays && /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: 52, color: "var(--muted)" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", marginBottom: 8 }, children: "⏳" }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: "0.88rem" }, children: "Loading collection data…" })
      ] }),
      !loadingDays && /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1rem", color: "var(--text)" }, children: "🎬 Original Box Office" }),
          /* @__PURE__ */ jsxs(
            "button",
            {
              className: "btn btn-gold btn-sm",
              style: { fontWeight: 800 },
              onClick: () => setModal({ isEdit: false, dayData: null, trackType: "original" }),
              children: [
                "+ Add Day ",
                nextDay
              ]
            }
          )
        ] }),
        days.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "40px 0", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: 12, marginBottom: 28 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", marginBottom: 8 }, children: "📭" }),
          /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, marginBottom: 6, color: "var(--text)", fontSize: "0.95rem" }, children: "No original box office data yet" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: "btn btn-gold btn-sm",
              style: { fontWeight: 800, marginTop: 8 },
              onClick: () => setModal({ isEdit: false, dayData: null, trackType: "original" }),
              children: "+ Add Day 1 Collection"
            }
          )
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { style: { overflowX: "auto", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 8 }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }, children: [
            /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { style: { background: "var(--bg2)" }, children: ["Day", "Date", "Net Collection", "Gross Collection", "Notes", ""].map((h, i) => /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", textAlign: "left", fontSize: "0.64rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, whiteSpace: "nowrap", borderBottom: "2px solid var(--border)" }, children: h }, i)) }) }),
            /* @__PURE__ */ jsx("tbody", { children: days.map((d, i) => /* @__PURE__ */ jsxs(
              "tr",
              {
                style: { borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)", transition: "background 0.1s" },
                onMouseEnter: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.05)",
                onMouseLeave: (e) => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                children: [
                  /* @__PURE__ */ jsxs("td", { style: { padding: "12px 16px", fontWeight: 800, color: "var(--gold)", whiteSpace: "nowrap" }, children: [
                    "Day ",
                    d.day,
                    d.day === 1 && /* @__PURE__ */ jsx("span", { style: { marginLeft: 6, fontSize: "0.6rem", background: "rgba(201,151,58,0.14)", color: "var(--gold)", padding: "1px 6px", borderRadius: 8 }, children: "Opening" })
                  ] }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", color: "var(--muted)", fontSize: "0.8rem" }, children: d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", fontWeight: 700 }, children: fmtINR(d.net) }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", fontWeight: 600, color: "#7ec8e3" }, children: fmtINR(d.gross) }),
                  /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", color: "var(--muted)", fontSize: "0.78rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: d.note || "—" }),
                  /* @__PURE__ */ jsxs("td", { style: { padding: "12px 16px", whiteSpace: "nowrap", display: "flex", gap: 6 }, children: [
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "btn btn-ghost btn-sm",
                        style: { fontSize: "0.72rem", padding: "4px 12px" },
                        onClick: () => setModal({ isEdit: true, dayData: d, trackType: "original" }),
                        children: "✏️ Edit"
                      }
                    ),
                    /* @__PURE__ */ jsx(
                      "button",
                      {
                        className: "btn btn-ghost btn-sm",
                        style: { fontSize: "0.72rem", padding: "4px 12px", color: "#e87a6a", border: "1px solid rgba(220,50,50,0.35)" },
                        onClick: async () => {
                          if (!window.confirm(`Delete Day ${d.day} collection data? This cannot be undone.`)) return;
                          try {
                            await API.adminDeleteBoxOfficeDay(selMovie._id, d.day, "original");
                            onToast(`Day ${d.day} deleted.`, "success");
                            loadDays(selMovie);
                          } catch (e) {
                            onToast("❌ Delete failed: " + e.message, "error");
                          }
                        },
                        children: "🗑️ Delete"
                      }
                    )
                  ] })
                ]
              },
              d.day
            )) }),
            /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { style: { background: "rgba(201,151,58,0.07)", borderTop: "2px solid var(--border)" }, children: [
              /* @__PURE__ */ jsxs("td", { colSpan: 2, style: { padding: "12px 16px", fontWeight: 800, fontSize: "0.78rem", color: "var(--gold)", textTransform: "uppercase", letterSpacing: "0.07em" }, children: [
                "TOTAL (",
                days.length,
                " day",
                days.length !== 1 ? "s" : "",
                ")"
              ] }),
              /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", fontWeight: 800, color: "var(--gold)", fontSize: "1rem" }, children: fmtINR(origTotalNet) }),
              /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", fontWeight: 800, color: "#7ec8e3", fontSize: "1rem" }, children: fmtINR(origTotalGross) }),
              /* @__PURE__ */ jsx("td", { colSpan: 2 })
            ] }) })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { style: { marginBottom: 32, padding: "10px 16px", background: "rgba(201,151,58,0.04)", border: "1px solid rgba(201,151,58,0.14)", borderRadius: 10, fontSize: "0.77rem", color: "var(--muted)", lineHeight: 1.7 }, children: [
            "💡 ",
            /* @__PURE__ */ jsx("strong", { style: { color: "var(--text)" }, children: "Tip:" }),
            " Use ",
            /* @__PURE__ */ jsxs("strong", { style: { color: "var(--gold)" }, children: [
              "+ Add Day ",
              nextDay
            ] }),
            " to record new data. Toggle ",
            /* @__PURE__ */ jsx("strong", { style: { color: "var(--gold)" }, children: "🤖 AI Blog" }),
            " to also publish an SEO article."
          ] })
        ] }),
        hasReRelease && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { style: { borderTop: "2px solid rgba(201,151,58,0.3)", margin: "8px 0 22px" } }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("div", { style: { fontWeight: 800, fontSize: "1rem", color: "#c9973a" }, children: "🔄 Re-Release Box Office" }),
              /* @__PURE__ */ jsxs("div", { style: { fontSize: "0.72rem", color: "var(--muted)", marginTop: 2 }, children: [
                "Re-Released: ",
                new Date(selMovie.reReleaseDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                className: "btn btn-gold btn-sm",
                style: { fontWeight: 800, background: "rgba(201,151,58,0.2)", border: "1px solid rgba(201,151,58,0.5)" },
                onClick: () => setModal({ isEdit: false, dayData: null, trackType: "re-release" }),
                children: [
                  "+ Add Re-Release Day ",
                  rrNextDay
                ]
              }
            )
          ] }),
          reReleaseDays.length === 0 ? /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "40px 0", color: "var(--muted)", border: "1px dashed rgba(201,151,58,0.35)", borderRadius: 12, marginBottom: 28 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontSize: "2rem", marginBottom: 8 }, children: "🔄" }),
            /* @__PURE__ */ jsx("div", { style: { fontWeight: 700, marginBottom: 6, color: "var(--text)", fontSize: "0.95rem" }, children: "No re-release box office data yet" }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: "0.8rem", marginBottom: 12 }, children: "Add re-release day-wise collection data to track the re-release run separately." }),
            /* @__PURE__ */ jsx(
              "button",
              {
                className: "btn btn-gold btn-sm",
                style: { fontWeight: 800 },
                onClick: () => setModal({ isEdit: false, dayData: null, trackType: "re-release" }),
                children: "+ Add Re-Release Day 1"
              }
            )
          ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("div", { style: { overflowX: "auto", borderRadius: 12, border: "1px solid rgba(201,151,58,0.3)", marginBottom: 8 }, children: /* @__PURE__ */ jsxs("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "0.88rem" }, children: [
              /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsx("tr", { style: { background: "rgba(201,151,58,0.06)" }, children: ["Day", "Date", "Net Collection", "Gross Collection", "Notes", ""].map((h, i) => /* @__PURE__ */ jsx("th", { style: { padding: "12px 16px", textAlign: "left", fontSize: "0.64rem", color: "#c9973a", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, whiteSpace: "nowrap", borderBottom: "2px solid rgba(201,151,58,0.25)" }, children: h }, i)) }) }),
              /* @__PURE__ */ jsx("tbody", { children: reReleaseDays.map((d, i) => /* @__PURE__ */ jsxs(
                "tr",
                {
                  style: { borderBottom: "1px solid var(--border)", background: i % 2 === 0 ? "transparent" : "rgba(201,151,58,0.02)", transition: "background 0.1s" },
                  onMouseEnter: (e) => e.currentTarget.style.background = "rgba(201,151,58,0.07)",
                  onMouseLeave: (e) => e.currentTarget.style.background = i % 2 === 0 ? "transparent" : "rgba(201,151,58,0.02)",
                  children: [
                    /* @__PURE__ */ jsxs("td", { style: { padding: "12px 16px", fontWeight: 800, color: "#c9973a", whiteSpace: "nowrap" }, children: [
                      "Day ",
                      d.day,
                      d.day === 1 && /* @__PURE__ */ jsx("span", { style: { marginLeft: 6, fontSize: "0.6rem", background: "rgba(201,151,58,0.18)", color: "#c9973a", padding: "1px 6px", borderRadius: 8 }, children: "Re-Opening" })
                    ] }),
                    /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", color: "var(--muted)", fontSize: "0.8rem" }, children: d.date ? new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—" }),
                    /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", fontWeight: 700 }, children: fmtINR(d.net) }),
                    /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", fontWeight: 600, color: "#7ec8e3" }, children: fmtINR(d.gross) }),
                    /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", color: "var(--muted)", fontSize: "0.78rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: d.note || "—" }),
                    /* @__PURE__ */ jsxs("td", { style: { padding: "12px 16px", whiteSpace: "nowrap", display: "flex", gap: 6 }, children: [
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          className: "btn btn-ghost btn-sm",
                          style: { fontSize: "0.72rem", padding: "4px 12px" },
                          onClick: () => setModal({ isEdit: true, dayData: d, trackType: "re-release" }),
                          children: "✏️ Edit"
                        }
                      ),
                      /* @__PURE__ */ jsx(
                        "button",
                        {
                          className: "btn btn-ghost btn-sm",
                          style: { fontSize: "0.72rem", padding: "4px 12px", color: "#e87a6a", border: "1px solid rgba(220,50,50,0.35)" },
                          onClick: async () => {
                            if (!window.confirm(`Delete Re-Release Day ${d.day}? This cannot be undone.`)) return;
                            try {
                              await API.adminDeleteBoxOfficeDay(selMovie._id, d.day, "re-release");
                              onToast(`Re-Release Day ${d.day} deleted.`, "success");
                              loadDays(selMovie);
                            } catch (e) {
                              onToast("❌ Delete failed: " + e.message, "error");
                            }
                          },
                          children: "🗑️ Delete"
                        }
                      )
                    ] })
                  ]
                },
                d.day
              )) }),
              /* @__PURE__ */ jsx("tfoot", { children: /* @__PURE__ */ jsxs("tr", { style: { background: "rgba(201,151,58,0.1)", borderTop: "2px solid rgba(201,151,58,0.3)" }, children: [
                /* @__PURE__ */ jsxs("td", { colSpan: 2, style: { padding: "12px 16px", fontWeight: 800, fontSize: "0.78rem", color: "#c9973a", textTransform: "uppercase", letterSpacing: "0.07em" }, children: [
                  "RE-RELEASE TOTAL (",
                  reReleaseDays.length,
                  " day",
                  reReleaseDays.length !== 1 ? "s" : "",
                  ")"
                ] }),
                /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", fontWeight: 800, color: "#c9973a", fontSize: "1rem" }, children: fmtINR(rrTotalNet) }),
                /* @__PURE__ */ jsx("td", { style: { padding: "12px 16px", fontWeight: 800, color: "#7ec8e3", fontSize: "1rem" }, children: fmtINR(rrTotalGross) }),
                /* @__PURE__ */ jsx("td", { colSpan: 2 })
              ] }) })
            ] }) }),
            /* @__PURE__ */ jsxs("div", { style: { marginBottom: 16, padding: "10px 16px", background: "rgba(201,151,58,0.04)", border: "1px solid rgba(201,151,58,0.2)", borderRadius: 10, fontSize: "0.77rem", color: "var(--muted)", lineHeight: 1.7 }, children: [
              "💡 ",
              /* @__PURE__ */ jsx("strong", { style: { color: "var(--text)" }, children: "Tip:" }),
              " Use ",
              /* @__PURE__ */ jsxs("strong", { style: { color: "#c9973a" }, children: [
                "+ Add Re-Release Day ",
                rrNextDay
              ] }),
              " to record more data. Toggle ",
              /* @__PURE__ */ jsx("strong", { style: { color: "#c9973a" }, children: "🤖 AI Blog" }),
              " to publish a re-release specific blog article."
            ] })
          ] })
        ] })
      ] })
    ] }),
    modal && selMovie && /* @__PURE__ */ jsx(
      DayModal,
      {
        movie: selMovie,
        isEdit: modal.isEdit,
        dayData: modal.isEdit ? modal.dayData : null,
        allDays: modal.trackType === "re-release" ? reReleaseDays : days,
        onClose: () => setModal(null),
        onSaved: () => loadDays(selMovie),
        onToast,
        trackType: modal.trackType || "original"
      }
    ),
    bulkModal && selMovie && /* @__PURE__ */ jsx(
      BulkUploadModal,
      {
        movie: selMovie,
        allDays: days,
        onClose: () => setBulkModal(false),
        onSaved: () => loadDays(selMovie),
        onToast
      }
    )
  ] });
}
export {
  BoxOfficePanel as default
};
