/**
 * generate-sitemap.js — run from Ollypedia-Backend after deploying
 * Generates sitemap.xml with proper SLUG URLs (title-year-id format).
 *
 * Usage:  node generate-sitemap.js
 * Or add: "postbuild": "node generate-sitemap.js"
 */

import fs   from "fs";
import path from "path";

const API_URL    = process.env.VITE_API_URL || "http://localhost:4000/api";
const SITE_URL   = "https://ollypedia.in";
const OUTPUT_DIR = process.env.OUTPUT_DIR || "../ollipedia-frontend/public";

// ── Slug helpers — MUST match src/utils/slugs.js exactly ──────────
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

// /movie/bindusagar-2026  (uses server-stored slug if available)
const movieSlug = (m) => {
  if (m.slug) return m.slug;
  const year = m.releaseDate ? new Date(m.releaseDate).getFullYear() : "";
  const base = toSlug(m.title || "movie");
  return year ? `${base}-${year}` : base;
};

// /cast/babushaan-mohanty
const castSlug = (c) => toSlug(c.name || "artist");
// ──────────────────────────────────────────────────────────────────

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

function xmlEscape(s = "") {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function urlEntry({ loc, lastmod, priority = "0.7", changefreq = "weekly" }) {
  const date = lastmod ? new Date(lastmod).toISOString().slice(0,10) : new Date().toISOString().slice(0,10);
  return `  <url>\n    <loc>${SITE_URL}${xmlEscape(loc)}</loc>\n    <lastmod>${date}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

async function generate() {
  console.log("🗺  Generating sitemap for", SITE_URL, "…");

  const [movies, castList] = await Promise.all([
    fetchJSON(`${API_URL}/movies`).catch(() => { console.warn("⚠️  Could not fetch movies"); return []; }),
    fetchJSON(`${API_URL}/cast`).catch(()   => { console.warn("⚠️  Could not fetch cast");   return []; }),
  ]);

  console.log(`   Found ${movies.length} movies, ${castList.length} cast members`);

  const urls = [];

  // Static pages
  urls.push(urlEntry({ loc: "/",       priority: "1.0", changefreq: "daily"  }));
  urls.push(urlEntry({ loc: "/movies", priority: "0.9", changefreq: "daily"  }));
  urls.push(urlEntry({ loc: "/cast",   priority: "0.8", changefreq: "weekly" }));
  urls.push(urlEntry({ loc: "/songs",  priority: "0.7", changefreq: "weekly" }));
  urls.push(urlEntry({ loc: "/news",   priority: "0.7", changefreq: "daily"  }));

  // Movie pages — slug URLs
  movies.forEach(m => {
    const isHit = m.verdict && !["Upcoming","Flop","Disaster"].includes(m.verdict);
    urls.push(urlEntry({
      loc:        `/movie/${movieSlug(m)}`,
      lastmod:    m.updatedAt || m.releaseDate,
      priority:   isHit ? "0.8" : "0.6",
      changefreq: m.verdict === "Upcoming" ? "weekly" : "monthly",
    }));
  });

  // Cast pages — slug URLs
  castList.forEach(c => {
    const n = c.movies?.length || 0;
    urls.push(urlEntry({
      loc:        `/cast/${castSlug(c)}`,
      lastmod:    c.updatedAt,
      priority:   n >= 5 ? "0.7" : n >= 2 ? "0.6" : "0.5",
      changefreq: "monthly",
    }));
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>`;

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const sitemapPath = path.join(OUTPUT_DIR, "sitemap.xml");
  fs.writeFileSync(sitemapPath, xml, "utf8");
  console.log(`✅  sitemap.xml → ${sitemapPath}  (${urls.length} URLs)`);

  const robotsTxt = `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n\nDisallow: /admin\nDisallow: /admin/\nDisallow: /dashboard\nDisallow: /dashboard/\nDisallow: /cast-portal\nDisallow: /register\nDisallow: /cast-register\n`;

  const robotsPath = path.join(OUTPUT_DIR, "robots.txt");
  fs.writeFileSync(robotsPath, robotsTxt, "utf8");
  console.log(`✅  robots.txt  → ${robotsPath}`);

  console.log(`\n📊 Total: ${urls.length} URLs  |  Submit: ${SITE_URL}/sitemap.xml`);
}

generate().catch(e => { console.error("❌", e.message); process.exit(1); });