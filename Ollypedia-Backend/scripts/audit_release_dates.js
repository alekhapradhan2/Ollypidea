/**
 * audit_release_dates.js
 * ──────────────────────
 * Audits every movie's release date in the DB against multiple sources:
 *
 *  Source 1 → TMDB (by imdbId first, then title search)
 *  Source 2 → OMDB / IMDb (by imdbId, then by title+year)
 *  Source 3 → Wikipedia REST API (title search fallback)
 *
 * Rules:
 *  - Only updates releaseDate if a confident, more specific date is found.
 *  - "More specific" = source gives YYYY-MM-DD and DB has YYYY-01-01 or YYYY-12-31 or just wrong year.
 *  - Always prefers the most specific date (full date > year-only).
 *  - Writes a detailed report CSV at the end.
 *  - Dry-run by default — set DRY_RUN=false to actually write to DB.
 *
 * Usage:
 *   node scripts/audit_release_dates.js              ← dry run (no DB writes)
 *   DRY_RUN=false node scripts/audit_release_dates.js ← write fixes to DB
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const TMDB_KEY = process.env.TMDB_API_KEY;
const OMDB_KEY = process.env.OMDB_API_KEY;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;
const DRY_RUN = process.env.DRY_RUN !== "false"; // default: dry run

if (!TMDB_KEY) { console.error("❌  TMDB_API_KEY not in .env"); process.exit(1); }
if (!MONGO_URI) { console.error("❌  MONGO_URI not in .env"); process.exit(1); }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── date helpers ─────────────────────────────────────────────────────────────

/** Returns true if the date looks like a placeholder (Jan 1 or Dec 31 or pure year) */
function isPlaceholderDate(dateStr) {
  if (!dateStr) return true;
  // Pure year e.g. "1976" or "01/01/1976"
  if (/^\d{4}$/.test(dateStr)) return true;
  // YYYY-01-01 or YYYY-12-31 are common TMDB/manual placeholders
  if (/\d{4}-01-01$/.test(dateStr)) return true;
  if (/\d{4}-12-31$/.test(dateStr)) return true;
  // Legacy format 01/01/YYYY
  if (/^01\/01\/\d{4}$/.test(dateStr)) return true;
  return false;
}

/** Normalise any date string to YYYY-MM-DD, or return null if unparseable */
function normalizeDate(raw) {
  if (!raw) return null;
  raw = raw.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // DD/MM/YYYY or MM/DD/YYYY — we'll try both; if day > 12 → DD/MM
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const [, a, b, y] = slash;
    const d = parseInt(a), m = parseInt(b);
    if (d > 12) return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    return `${y}-${String(a).padStart(2,"0")}-${String(b).padStart(2,"0")}`;
  }

  // "28 Apr 1936" or "April 28, 1936"
  const parsed = new Date(raw);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }
  return null;
}

/**
 * Pick the "better" date:
 *  - ALWAYS trust the external source (TMDB/OMDB/Wiki) over the DB if they differ.
 *  - Exception: If the source only gives a placeholder (e.g. YYYY-01-01) and DB has a real date for the same year, keep DB.
 */
function betterDate(dbDate, sourceDate) {
  const db  = normalizeDate(dbDate);
  const src = normalizeDate(sourceDate);
  if (!src) return null;                         // source gave nothing useful
  if (db === src) return null;                   // same — no change needed
  if (!db) return src;                           // DB has nothing — use source

  const dbYear  = parseInt(db.slice(0, 4));
  const srcYear = parseInt(src.slice(0, 4));

  // If source is a placeholder (e.g. 1976-01-01) but DB is a real date (1976-04-28), keep DB.
  if (isPlaceholderDate(src) && !isPlaceholderDate(db)) {
    if (dbYear === srcYear) return null;
  }

  // ─── CRITICAL TITLE COLLISION CHECK ────────────────────────────────────────
  // If TMDB says the movie is >3 years NEWER than what the DB says, reject it!
  // Example: DB says "Durga" is 1975. TMDB finds "Durga" 2023. We block this.
  // Example: DB says "Sita Bibaha" is 2024. TMDB finds 1976. Allowed! (diff is negative)
  const diff = srcYear - dbYear;
  if (diff > 3) {
    return null; // Too far in the future — must be a different movie with same name
  }

  // Otherwise, ALWAYS trust the external source over our DB
  return src;
}

// ─── Source 1: TMDB ──────────────────────────────────────────────────────────

async function fetchFromTMDB_byImdbId(imdbId) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_KEY}&external_source=imdb_id`;
    const res = await fetch(url);
    const data = await res.json();
    const results = data.movie_results || [];
    if (results.length === 0) return null;
    return results[0].release_date || null;
  } catch { return null; }
}

async function fetchFromTMDB_byTitle(title, year) {
  try {
    const q = encodeURIComponent(title);
    let url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${q}&language=or`;
    if (year) url += `&year=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    const results = (data.results || []);

    // Prefer Odia language results
    const odiaResults = results.filter(r => r.original_language === "or");

    // If no Odia results, ONLY fall back to non-Odia if we have a strict year match
    // (This prevents "Rockstar" from matching the 2011 Hindi movie when we search without a year)
    let pool = [];
    if (odiaResults.length > 0) {
      pool = odiaResults;
    } else if (year) {
      pool = results.filter(r => r.release_date && r.release_date.startsWith(year));
    }

    if (pool.length === 0) return null;

    // Pick closest title match
    const norm = t => t.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
    const normTitle = norm(title);
    const best = pool.find(r =>
      norm(r.title) === normTitle || norm(r.original_title) === normTitle
    ) || pool[0];

    return best.release_date || null;
  } catch { return null; }
}

// ─── Source 2: OMDB ──────────────────────────────────────────────────────────

async function fetchFromOMDB_byImdbId(imdbId) {
  if (!OMDB_KEY) return null;
  try {
    const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${imdbId}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.Response === "False") return null;
    // OMDB returns "DD MMM YYYY" or "YYYY"
    return normalizeDate(data.Released !== "N/A" ? data.Released : data.Year) || null;
  } catch { return null; }
}

async function fetchFromOMDB_byTitle(title, year) {
  if (!OMDB_KEY) return null;
  try {
    const t = encodeURIComponent(title);
    let url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&t=${t}&type=movie`;
    if (year) url += `&y=${year}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.Response === "False") return null;
    return normalizeDate(data.Released !== "N/A" ? data.Released : data.Year) || null;
  } catch { return null; }
}

// ─── Source 3: Wikipedia ─────────────────────────────────────────────────────

/** Extract a date from Wikipedia article extract text */
function extractDateFromWikiText(text) {
  if (!text) return null;
  // Look for patterns like "released on 28 April 1936" or "release date: April 28, 1936"
  const patterns = [
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i,
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i,
    /(\d{4})-(\d{2})-(\d{2})/,
  ];
  const months = { january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12 };

  for (const pat of patterns) {
    const m = text.match(pat);
    if (!m) continue;
    if (/\d{4}-\d{2}-\d{2}/.test(pat.source)) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
    let day, month, year;
    if (/^\d/.test(m[1])) {
      // DD Month YYYY
      day = parseInt(m[1]); month = months[m[2].toLowerCase()]; year = parseInt(m[3]);
    } else {
      // Month DD YYYY
      month = months[m[1].toLowerCase()]; day = parseInt(m[2]); year = parseInt(m[3]);
    }
    if (day && month && year) {
      return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    }
  }
  return null;
}

async function fetchFromWikipedia(title, year) {
  try {
    // Try with "Odia film" suffix for better precision
    const queries = [
      `${title} (${year} film)`,
      `${title} Odia film`,
      title,
    ];
    for (const q of queries) {
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&format=json`;
      const searchRes = await fetch(searchUrl);
      const searchData = await searchRes.json();
      const pages = searchData[1] || [];
      if (pages.length === 0) continue;

      for (const pageName of pages.slice(0, 2)) {
        const extractUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=true&explaintext=true&titles=${encodeURIComponent(pageName)}&format=json`;
        const extractRes = await fetch(extractUrl);
        const extractData = await extractRes.json();
        const pages_ = Object.values(extractData.query?.pages || {});
        if (pages_.length === 0) continue;
        const extract = pages_[0]?.extract || "";
        const date = extractDateFromWikiText(extract);
        if (date) {
          const dateYear = date.slice(0, 4);
          // Sanity: date year should be within ±1 of expected year
          if (!year || Math.abs(parseInt(dateYear) - parseInt(year)) <= 1) {
            return date;
          }
        }
      }
    }
    return null;
  } catch { return null; }
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB");
  console.log(DRY_RUN ? "🔍  DRY RUN — no DB writes\n" : "✍️   LIVE MODE — will update DB\n");

  const moviesColl = mongoose.connection.collection("movies");
  // Load ALL matching movies into memory upfront — prevents MongoDB cursor
  // timeout (CursorNotFound) which happens when API calls take too long between reads.
  const movies = await moviesColl.find({
    releaseDate: { $gt: "", $lt: "2026-01-01" }
  }).sort({ releaseDate: 1 }).toArray();

  console.log(`📋  ${movies.length} movies to check\n`);

  const report = []; // for CSV export
  let checked = 0, updated = 0, placeholder = 0, noSource = 0;

  for (const movie of movies) {
    checked++;
    const { _id, title, releaseDate, imdbId } = movie;
    const dbDate = normalizeDate(releaseDate) || releaseDate || "";

    // Extract year from existing date for search hints
    const dbYear = dbDate ? dbDate.slice(0, 4) : null;

    process.stdout.write(`\r[${checked}] Checking: ${title} (${dbDate || "no date"})...          `);

    let foundDate = null;
    let source = "";

    // ── Source 1: TMDB by IMDB ID ──────────────────────────────────────────
    if (imdbId && imdbId.startsWith("tt")) {
      foundDate = await fetchFromTMDB_byImdbId(imdbId);
      if (foundDate) source = "TMDB(imdbId)";
      await sleep(50);
    }

    // ── Source 1b: TMDB by title search ────────────────────────────────────
    if (!foundDate && title) {
      foundDate = await fetchFromTMDB_byTitle(title, dbYear); // try with year
      if (!foundDate && dbYear) {
        foundDate = await fetchFromTMDB_byTitle(title, null); // try without year!
      }
      if (foundDate) source = "TMDB(title)";
      await sleep(60);
    }

    // ── Source 2: OMDB by IMDB ID ──────────────────────────────────────────
    if (!foundDate && imdbId && imdbId.startsWith("tt")) {
      foundDate = await fetchFromOMDB_byImdbId(imdbId);
      if (foundDate) source = "OMDB(imdbId)";
      await sleep(50);
    }

    // ── Source 2b: OMDB by title ───────────────────────────────────────────
    if (!foundDate && title && dbYear) {
      // ONLY search OMDB if we have a year. Searching without a year is too
      // dangerous for generic titles (OMDB has no language filter).
      foundDate = await fetchFromOMDB_byTitle(title, dbYear);
      if (foundDate) source = "OMDB(title)";
      await sleep(50);
    }

    // ── Source 3: Wikipedia ────────────────────────────────────────────────
    if (!foundDate && title && dbYear) {
      // ONLY search Wikipedia if we have a year.
      foundDate = await fetchFromWikipedia(title, dbYear);
      if (foundDate) source = "Wikipedia";
      await sleep(80);
    }

    // ── Decide whether to update ───────────────────────────────────────────
    const improvement = betterDate(dbDate, foundDate);

    const rowStatus = improvement
      ? "UPDATE"
      : (!foundDate ? "NOT_FOUND" : "OK");

    if (rowStatus === "UPDATE") {
      updated++;
      if (!DRY_RUN) {
        await moviesColl.updateOne({ _id }, { $set: { releaseDate: improvement } });
      }
      console.log(
        `\n  📅 "${title}": ${dbDate || "NONE"} → ${improvement} (${source})${DRY_RUN ? " [DRY RUN]" : " ✅ UPDATED"}`
      );
    } else if (!foundDate) {
      noSource++;
    }

    if (isPlaceholderDate(dbDate)) placeholder++;

    report.push({
      title,
      dbDate:  dbDate || "",
      foundDate: foundDate || "",
      source,
      action: rowStatus,
      newDate: improvement || "",
      imdbId: imdbId || "",
    });
  }

  // ── Write CSV report ──────────────────────────────────────────────────────
  const csvPath = path.join(__dirname, "../release_date_audit.csv");
  const header = "Title,DB Date,Found Date,Source,Action,New Date,IMDb ID\n";
  const rows = report.map(r =>
    [r.title, r.dbDate, r.foundDate, r.source, r.action, r.newDate, r.imdbId]
      .map(v => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  ).join("\n");
  fs.writeFileSync(csvPath, header + rows, "utf8");

  console.log("\n\n════════════════════════════════════════════════════════");
  console.log(`🎬  Movies checked         : ${checked}`);
  console.log(`📅  Placeholder dates found: ${placeholder}`);
  console.log(`✅  Dates updated/to update: ${updated}${DRY_RUN ? " (DRY RUN)" : ""}`);
  console.log(`❓  No source found        : ${noSource}`);
  console.log(`📄  Report saved to        : release_date_audit.csv`);
  console.log("════════════════════════════════════════════════════════");

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error("\n❌  Fatal:", err.message);
  process.exit(1);
});
