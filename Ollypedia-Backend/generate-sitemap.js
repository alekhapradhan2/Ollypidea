/**
 * generate-sitemap.js — Ollypedia Backend
 *
 * Generates sitemap.xml + robots.txt with clean SEO URLs:
 *   /movie/bindusagar-2026
 *   /cast/babushaan-mohanty
 *   /song/bindusagar-2026/0/title-odia-song
 *
 * Usage:
 *   node generate-sitemap.js
 *
 * Run from the Ollypedia-Backend folder while server is running.
 * Output goes to: ../ollipedia-frontend/public/
 */

import fs   from "fs";
import path from "path";

const API_URL    = process.env.API_URL    || "http://localhost:4000/api";
const SITE_URL   = process.env.SITE_URL   || "https://ollypedia.in";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "../ollipedia-frontend/public";

// ── Slug helpers — matches src/utils/slugs.js exactly ─────────────
function toSlug(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 80);
}

function movieSlug(m) {
  if (m.slug) return m.slug;
  const year = m.releaseDate ? new Date(m.releaseDate).getFullYear() : "";
  const base = toSlug(m.title || "movie");
  return year ? `${base}-${year}` : base;
}

function castSlug(c) {
  return toSlug(c.name || "artist");
}

function buildSongUrl(movie, songIndex, song) {
  const ms   = movieSlug(movie);
  const idx  = typeof songIndex === "number" && !isNaN(songIndex) ? songIndex : 0;
  const slug = song.title ? `/${toSlug(song.title)}-odia-song` : "";
  return `/song/${ms}/${idx}${slug}`;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function xmlEscape(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function urlEntry({ loc, lastmod, priority = "0.7", changefreq = "weekly" }) {
  const date = lastmod
    ? new Date(lastmod).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return [
    "  <url>",
    `    <loc>${SITE_URL}${xmlEscape(loc)}</loc>`,
    `    <lastmod>${date}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

async function generate() {
  console.log("Generating sitemap for", SITE_URL, "...\n");

  const [movies, castList] = await Promise.all([
    fetchJSON(`${API_URL}/movies`).catch(() => {
      console.warn("Could not fetch movies — is the server running?");
      return [];
    }),
    fetchJSON(`${API_URL}/cast`).catch(() => {
      console.warn("Could not fetch cast");
      return [];
    }),
  ]);

  const totalSongs = movies.reduce((a, m) => a + (m.media?.songs?.length || 0), 0);
  console.log(`   ${movies.length} movies`);
  console.log(`   ${castList.length} cast members`);
  console.log(`   ${totalSongs} songs\n`);

  const urls = [];

  // Static pages
  urls.push(urlEntry({ loc: "/",        priority: "1.0", changefreq: "daily"   }));
  urls.push(urlEntry({ loc: "/movies",  priority: "0.9", changefreq: "daily"   }));
  urls.push(urlEntry({ loc: "/cast",    priority: "0.8", changefreq: "weekly"  }));
  urls.push(urlEntry({ loc: "/songs",   priority: "0.8", changefreq: "weekly"  }));
  urls.push(urlEntry({ loc: "/news",    priority: "0.7", changefreq: "daily"   }));
  urls.push(urlEntry({ loc: "/about",   priority: "0.4", changefreq: "monthly" }));
  urls.push(urlEntry({ loc: "/contact", priority: "0.4", changefreq: "monthly" }));
  urls.push(urlEntry({ loc: "/privacy", priority: "0.3", changefreq: "monthly" }));

  // Movie pages
  movies.forEach(m => {
    const isHit = m.verdict && !["Upcoming", "Flop", "Disaster"].includes(m.verdict);
    urls.push(urlEntry({
      loc:        `/movie/${movieSlug(m)}`,
      lastmod:    m.updatedAt || m.releaseDate,
      priority:   isHit ? "0.8" : "0.6",
      changefreq: m.verdict === "Upcoming" ? "weekly" : "monthly",
    }));
  });

  // Song pages
  movies.forEach(m => {
    (m.media?.songs || []).forEach((s, i) => {
      if (!s.title) return;
      urls.push(urlEntry({
        loc:        buildSongUrl(m, i, s),
        lastmod:    m.updatedAt || m.releaseDate,
        priority:   "0.6",
        changefreq: "monthly",
      }));
    });
  });

  // Cast pages
  castList.forEach(c => {
    const filmCount = c.movies?.length || 0;
    urls.push(urlEntry({
      loc:        `/cast/${castSlug(c)}`,
      lastmod:    c.updatedAt,
      priority:   filmCount >= 5 ? "0.7" : filmCount >= 2 ? "0.6" : "0.5",
      changefreq: "monthly",
    }));
  });

  // Write sitemap.xml
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>",
  ].join("\n");

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const sitemapPath = path.join(OUTPUT_DIR, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log(`sitemap.xml  -> ${sitemapPath}`);
  console.log(`${urls.length} total URLs`);

  // Write robots.txt
  const robots = [
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /dashboard",
    "Disallow: /dashboard/",
    "Disallow: /cast-portal",
    "Disallow: /register",
    "Disallow: /cast-register",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n");

  const robotsPath = path.join(OUTPUT_DIR, "robots.txt");
  fs.writeFileSync(robotsPath, robots, "utf8");
  console.log(`robots.txt   -> ${robotsPath}`);

  console.log(`\nSummary:`);
  console.log(`  Static : 8`);
  console.log(`  Movies : ${movies.length}`);
  console.log(`  Songs  : ${totalSongs}`);
  console.log(`  Cast   : ${castList.length}`);
  console.log(`  Total  : ${urls.length}`);
  console.log(`\nSubmit to Google: ${SITE_URL}/sitemap.xml\n`);
}

generate().catch(e => {
  console.error("Error:", e.message);
  process.exit(1);
});